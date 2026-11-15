import { randomUUID } from "node:crypto";
import { buildSchedule } from "../domain/finance.js";
import { allocatePayment, totalOutstanding } from "../domain/payments.js";
import { classifyArrears } from "../domain/arrears.js";
import { assertTransition, installmentTransitions, loanTransitions } from "../domain/states.js";
import { httpError } from "../utils/httpError.js";
import { writeAudit } from "./audit.service.js";

const HOUR_MS = 60 * 60 * 1000;

// Formaliza una solicitud APROBADA: crea el préstamo en PENDING_DISBURSEMENT (aún no hay desembolso).
// La tasa sale de la política con que se evaluó la solicitud, no se escribe a mano (ADR-003).
export async function formalizeLoan(prisma, { applicationId, actor }) {
  return prisma.$transaction(async (tx) => {
    const application = await tx.loanApplication.findUnique({
      where: { id: applicationId },
      select: { id: true, status: true, requestedAmount: true, requestedTerm: true, loan: { select: { id: true } } }
    });
    if (!application) throw httpError(404, "Solicitud no encontrada.");
    if (application.status !== "APPROVED") {
      throw httpError(409, `Solo se puede formalizar una solicitud APPROVED. Estado actual: ${application.status}.`);
    }
    if (application.loan) throw httpError(409, "Esta solicitud ya tiene un préstamo.");

    const decision = await tx.loanDecision.findFirst({
      where: { applicationId, outcome: "APPROVED" },
      orderBy: { decidedAt: "desc" }
    });
    if (!decision) throw httpError(409, "La solicitud no tiene una decisión de aprobación registrada.");

    const evaluation = await tx.riskEvaluation.findFirst({
      where: { applicationId },
      orderBy: { evaluatedAt: "desc" },
      include: { policy: true }
    });
    const annualRate = evaluation?.policy?.annualInterestRate;
    if (annualRate === null || annualRate === undefined) {
      throw httpError(409, "No se puede formalizar: la solicitud necesita una evaluación hecha con una política que defina la tasa de interés.");
    }

    const loan = await tx.loan.create({
      data: {
        loanNumber: `LN-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`,
        applicationId,
        principal: application.requestedAmount,
        annualRate,
        termMonths: application.requestedTerm,
        status: "PENDING_DISBURSEMENT"
      }
    });

    await writeAudit(tx, {
      actorId: actor.id,
      action: "LOAN_FORMALIZED",
      entityType: "Loan",
      entityId: loan.id,
      description: `Préstamo ${loan.loanNumber} creado desde la solicitud aprobada`,
      metadata: { applicationId, decisionId: decision.id, policyId: evaluation.policyId, policyVersion: evaluation.policy.version, annualRate }
    });
    return loan;
  });
}

// Desembolso: PENDING_DISBURSEMENT -> ACTIVE y generación del cronograma. (Se registra la fecha; el dinero
// se entrega fuera del sistema: los desembolsos reales están fuera del alcance académico.)
export async function disburseLoan(prisma, { loanId, actor, disbursementDate = new Date() }) {
  return prisma.$transaction(async (tx) => {
    const loan = await tx.loan.findUnique({ where: { id: loanId } });
    if (!loan) throw httpError(404, "Préstamo no encontrado.");
    assertTransition(loanTransitions, loan.status, "ACTIVE", "Préstamo");

    const rows = buildSchedule({
      principal: loan.principal,
      annualRatePercent: loan.annualRate,
      termMonths: loan.termMonths,
      disbursementDate
    });

    const updated = await tx.loan.updateMany({
      where: { id: loanId, status: loan.status },
      data: { status: "ACTIVE", disbursementDate }
    });
    if (updated.count !== 1) throw httpError(409, "El préstamo cambió mientras se procesaba. Recarga e intenta de nuevo.");

    await tx.paymentSchedule.createMany({ data: rows.map((row) => ({ loanId, ...row })) });

    await writeAudit(tx, {
      actorId: actor.id,
      action: "LOAN_DISBURSED",
      entityType: "Loan",
      entityId: loanId,
      description: `Préstamo ${loan.loanNumber} desembolsado; cronograma de ${rows.length} cuotas generado`,
      metadata: { disbursementDate, installments: rows.length, installmentAmount: rows[0].totalDue }
    });

    return { loanId, status: "ACTIVE", disbursementDate, schedule: rows };
  });
}

// Registra un pago y lo reparte entre las cuotas (domain/payments.js). Si el saldo llega a 0, el préstamo pasa a PAID.
export async function registerPayment(prisma, { loanId, amount, paymentDate, reference, notes, actor, now = new Date() }) {
  const date = paymentDate ?? now;
  if (date.getTime() > now.getTime() + 24 * HOUR_MS) throw httpError(400, "La fecha del pago no puede estar en el futuro.");

  return prisma.$transaction(async (tx) => {
    const loan = await tx.loan.findUnique({ where: { id: loanId } });
    if (!loan) throw httpError(404, "Préstamo no encontrado.");
    if (loan.status !== "ACTIVE") throw httpError(409, `Solo se registran pagos en préstamos ACTIVE. Estado actual: ${loan.status}.`);

    const installments = await tx.paymentSchedule.findMany({ where: { loanId }, orderBy: { installment: "asc" } });
    const pending = totalOutstanding(installments);
    if (amount > pending) throw httpError(400, `El pago (${amount}) excede el saldo pendiente (${pending}).`);

    const { allocations } = allocatePayment(installments, amount);
    const byId = new Map(installments.map((i) => [i.id, i]));

    for (const allocation of allocations) {
      const current = byId.get(allocation.scheduleId);
      assertTransition(installmentTransitions, current.status, allocation.status, `Cuota ${current.installment}`);
      const updated = await tx.paymentSchedule.updateMany({
        where: { id: allocation.scheduleId, paidAmount: allocation.paidBefore },
        data: {
          paidAmount: allocation.paidAfter,
          status: allocation.status,
          ...(allocation.status === "PAID" ? { paidAt: date } : {})
        }
      });
      if (updated.count !== 1) throw httpError(409, "Otro pago se registró al mismo tiempo. Recarga e intenta de nuevo.");
    }

    const payment = await tx.payment.create({
      data: {
        loanId, amount, paymentDate: date, reference, notes,
        status: "CONFIRMED",
        recordedById: actor.id,
        allocations: allocations.map(({ scheduleId, installment, applied, interestPaid, principalPaid }) => (
          { scheduleId, installment, applied, interestPaid, principalPaid }
        ))
      }
    });

    const remainingBalance = pending - amount;
    let loanStatus = loan.status;
    if (remainingBalance === 0) {
      assertTransition(loanTransitions, loan.status, "PAID", "Préstamo");
      await tx.loan.updateMany({ where: { id: loanId, status: loan.status }, data: { status: "PAID" } });
      loanStatus = "PAID";
    }

    await writeAudit(tx, {
      actorId: actor.id,
      action: "PAYMENT_REGISTERED",
      entityType: "Loan",
      entityId: loanId,
      description: `Pago de ${amount} registrado en ${loan.loanNumber}`,
      metadata: { paymentId: payment.id, amount, remainingBalance, loanStatus }
    });

    return { payment, allocations, remainingBalance, loanStatus };
  });
}

// Marca como OVERDUE las cuotas vencidas con saldo de un préstamo y devuelve la lista de mora.
export async function refreshArrears(prisma, { loanId, actor, today = new Date() }) {
  return prisma.$transaction(async (tx) => {
    const loan = await tx.loan.findUnique({ where: { id: loanId } });
    if (!loan) throw httpError(404, "Préstamo no encontrado.");
    if (loan.status !== "ACTIVE") throw httpError(409, `Solo se revisa la mora de préstamos ACTIVE. Estado actual: ${loan.status}.`);

    const installments = await tx.paymentSchedule.findMany({ where: { loanId }, orderBy: { installment: "asc" } });
    const arrears = classifyArrears(installments, today);
    const byId = new Map(installments.map((i) => [i.id, i]));

    let updatedCount = 0;
    for (const item of arrears.filter((a) => a.needsStatusUpdate)) {
      assertTransition(installmentTransitions, byId.get(item.id).status, "OVERDUE", `Cuota ${item.installment}`);
      const result = await tx.paymentSchedule.updateMany({
        where: { id: item.id, status: byId.get(item.id).status },
        data: { status: "OVERDUE" }
      });
      updatedCount += result.count;
    }

    if (updatedCount > 0) {
      await writeAudit(tx, {
        actorId: actor.id,
        action: "ARREARS_REFRESHED",
        entityType: "Loan",
        entityId: loanId,
        description: `${updatedCount} cuota(s) de ${loan.loanNumber} pasaron a OVERDUE`,
        metadata: { installments: arrears.filter((a) => a.needsStatusUpdate).map((a) => a.installment) }
      });
    }
    return { loanId, loanNumber: loan.loanNumber, updated: updatedCount, arrears };
  });
}

// Lista de mora de todos los préstamos activos (solo lectura).
export async function listArrears(prisma, { today = new Date() } = {}) {
  const installments = await prisma.paymentSchedule.findMany({
    where: { status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] }, dueDate: { lt: today }, loan: { status: "ACTIVE" } },
    orderBy: [{ loanId: "asc" }, { installment: "asc" }],
    include: {
      loan: {
        select: {
          id: true,
          loanNumber: true,
          application: { select: { applicant: { select: { firstName: true, lastName: true, documentNumber: true, phone: true } } } }
        }
      }
    }
  });

  const grouped = new Map();
  for (const item of classifyArrears(installments, today)) {
    const source = installments.find((i) => i.id === item.id);
    const key = source.loan.id;
    if (!grouped.has(key)) {
      grouped.set(key, { loanId: key, loanNumber: source.loan.loanNumber, applicant: source.loan.application.applicant, installments: [] });
    }
    grouped.get(key).installments.push(item);
  }
  return [...grouped.values()].map((entry) => ({
    ...entry,
    totalOutstanding: entry.installments.reduce((sum, i) => sum + i.outstanding, 0),
    maxDaysOverdue: Math.max(...entry.installments.map((i) => i.daysOverdue))
  }));
}

// Castigo: ACTIVE -> WRITTEN_OFF. Exige justificación.
export async function writeOffLoan(prisma, { loanId, actor, justification }) {
  return prisma.$transaction(async (tx) => {
    const loan = await tx.loan.findUnique({ where: { id: loanId } });
    if (!loan) throw httpError(404, "Préstamo no encontrado.");
    assertTransition(loanTransitions, loan.status, "WRITTEN_OFF", "Préstamo");

    const updated = await tx.loan.updateMany({ where: { id: loanId, status: loan.status }, data: { status: "WRITTEN_OFF" } });
    if (updated.count !== 1) throw httpError(409, "El préstamo cambió mientras se procesaba. Recarga e intenta de nuevo.");

    await writeAudit(tx, {
      actorId: actor.id,
      action: "LOAN_WRITTEN_OFF",
      entityType: "Loan",
      entityId: loanId,
      description: `Préstamo ${loan.loanNumber} castigado`,
      metadata: { justification, previousStatus: loan.status }
    });
    return { loanId, status: "WRITTEN_OFF" };
  });
}
