import { randomUUID } from "node:crypto";
import { buildSchedule } from "../domain/finance.js";
import { allocatePayment, outstanding, totalOutstanding } from "../domain/payments.js";
import { classifyArrears, classifyArrearsDays, daysOverdue, startOfDayUTC } from "../domain/arrears.js";
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
    where: { status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] }, dueDate: { lt: new Date(startOfDayUTC(today) + DAY_MS) }, loan: { status: "ACTIVE" } },
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
  return [...grouped.values()].map((entry) => {
    const maxDaysOverdue = Math.max(...entry.installments.map((i) => i.daysOverdue));
    const category = classifyArrearsDays(maxDaysOverdue);
    return {
      ...entry,
      category,
      totalOutstanding: entry.installments.reduce((sum, i) => sum + i.outstanding, 0),
      maxDaysOverdue
    };
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;
const UPCOMING_PAYMENT_ALERT_DAYS = Number.parseInt(process.env.UPCOMING_PAYMENT_ALERT_DAYS ?? "3", 10);

async function createAlertOnce(tx, data) {
  const existing = await tx.alert.findFirst({
    where: { scheduleId: data.scheduleId, type: data.type, referenceDate: data.referenceDate },
    select: { id: true }
  });
  if (existing) return false;
  await tx.alert.create({ data });
  return true;
}

// Proceso diario idempotente: actualiza cuotas vencidas y genera alertas por vencimiento,
// primer día de mora y escalamiento de categoría. No calcula intereses de mora.
export async function monitorArrears(prisma, {
  today = new Date(),
  upcomingDays = UPCOMING_PAYMENT_ALERT_DAYS
} = {}) {
  if (!Number.isInteger(upcomingDays) || upcomingDays < 0 || upcomingDays > 90) {
    throw new RangeError("UPCOMING_PAYMENT_ALERT_DAYS debe ser un entero entre 0 y 90.");
  }
  const todayStart = startOfDayUTC(today);
  const horizonEnd = new Date(todayStart + (upcomingDays + 1) * DAY_MS - 1);

  return prisma.$transaction(async (tx) => {
    const schedules = await tx.paymentSchedule.findMany({
      where: {
        status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] },
        dueDate: { lte: horizonEnd },
        loan: { status: "ACTIVE" }
      },
      orderBy: [{ loanId: "asc" }, { installment: "asc" }]
    });

    let updatedCount = 0;
    let alertsCreated = 0;
    for (const schedule of schedules) {
      const overdueDays = daysOverdue(schedule.dueDate, today);
      if (outstanding(schedule) > 0 && overdueDays > 0 && schedule.status !== "OVERDUE") {
        const updated = await tx.paymentSchedule.updateMany({
          where: { id: schedule.id, status: schedule.status },
          data: { status: "OVERDUE" }
        });
        updatedCount += updated.count;
      }

      const dueDay = startOfDayUTC(schedule.dueDate);
      const referenceDate = new Date(dueDay);
      const upcomingDaysLeft = -overdueDays;
      if (outstanding(schedule) > 0 && upcomingDaysLeft >= 0 && upcomingDaysLeft <= upcomingDays) {
        const created = await createAlertOnce(tx, {
          loanId: schedule.loanId,
          scheduleId: schedule.id,
          type: "UPCOMING_PAYMENT",
          referenceDate,
          daysOffset: upcomingDaysLeft,
          title: upcomingDaysLeft === 0 ? "Cuota vence hoy" : "Próximo vencimiento",
          message: upcomingDaysLeft === 0
            ? `La cuota ${schedule.installment} vence hoy.`
            : `La cuota ${schedule.installment} vence en ${upcomingDaysLeft} día(s).`
        });
        if (created) alertsCreated += 1;
      }

      // Si el proceso estuvo detenido, recupera también los hitos de mora omitidos.
      const thresholds = [
        { days: 1, type: "ARREARS_LIGHT", title: "Inicio de retraso leve" },
        { days: 31, type: "ARREARS_EARLY", title: "Escalamiento a mora temprana" },
        { days: 61, type: "ARREARS_ESTABLISHED", title: "Escalamiento a mora establecida" }
      ];
      for (const threshold of thresholds) {
        if (outstanding(schedule) <= 0 || overdueDays < threshold.days) continue;
        const milestoneDate = new Date(dueDay + threshold.days * DAY_MS);
        const created = await createAlertOnce(tx, {
          loanId: schedule.loanId,
          scheduleId: schedule.id,
          type: threshold.type,
          referenceDate: milestoneDate,
          daysOffset: threshold.days,
          title: threshold.title,
          message: `La cuota ${schedule.installment} alcanzó ${threshold.days} día(s) de mora.`
        });
        if (created) alertsCreated += 1;
      }
    }

    if (updatedCount > 0 || alertsCreated > 0) {
      await writeAudit(tx, {
        actorId: null,
        action: "ARREARS_MONITORED",
        entityType: "PaymentSchedule",
        entityId: "daily-monitor",
        description: `${updatedCount} cuota(s) vencida(s) clasificadas automáticamente`,
        metadata: { updatedCount, alertsCreated, asOf: today.toISOString(), upcomingDays }
      });
    }
    return { checked: schedules.length, updated: updatedCount, alertsCreated, upcomingDays };
  });
}

export async function listArrearsAlerts(prisma) {
  return prisma.alert.findMany({
    where: { status: "UNREAD" },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      loan: {
        select: {
          id: true,
          loanNumber: true,
          application: { select: { applicant: { select: { firstName: true, lastName: true } } } }
        }
      },
      schedule: { select: { installment: true, dueDate: true, totalDue: true, paidAmount: true } }
    }
  });
}

export async function registerCollectionAction(prisma, {
  loanId, description, result, actor, performedAt = new Date()
}) {
  return prisma.$transaction(async (tx) => {
    const loan = await tx.loan.findUnique({ where: { id: loanId } });
    if (!loan) throw httpError(404, "Préstamo no encontrado.");
    if (loan.status !== "ACTIVE") {
      throw httpError(409, "Solo se registran gestiones de cobro en préstamos activos.");
    }
    const action = await tx.collectionAction.create({
      data: {
        loanId,
        description,
        ...(result ? { result } : {}),
        performedAt,
        recordedById: actor.id
      }
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: "COLLECTION_ACTION_REGISTERED",
      entityType: "Loan",
      entityId: loanId,
      description: `Gestión de cobro registrada para ${loan.loanNumber}`,
      metadata: { collectionActionId: action.id, performedAt, description, result: result ?? null }
    });
    return action;
  });
}

export async function markAlertRead(prisma, { alertId, actor }) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.alert.updateMany({
      where: { id: alertId, status: "UNREAD" },
      data: { status: "READ", readAt: new Date() }
    });
    if (updated.count !== 1) throw httpError(404, "La alerta no existe o ya fue atendida.");
    await writeAudit(tx, {
      actorId: actor.id,
      action: "ARREARS_ALERT_READ",
      entityType: "Alert",
      entityId: alertId,
      description: "Alerta administrativa marcada como leída"
    });
    return { id: alertId, status: "READ" };
  });
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
