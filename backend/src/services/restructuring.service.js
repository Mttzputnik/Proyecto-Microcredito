import { buildSchedule, addMonths } from "../domain/finance.js";
import { outstanding } from "../domain/payments.js";
import { daysOverdue } from "../domain/arrears.js";
import { calculateRestructuringBalance } from "../domain/restructuring.js";
import { writeAudit } from "./audit.service.js";
import { httpError } from "../utils/httpError.js";

const POLICY_MODES = ["CAPITALIZE", "REQUIRE_PAYMENT"];

export async function listRestructuringPolicies(prisma) {
  return prisma.restructuringPolicy.findMany({
    where: { active: true, effectiveFrom: { lte: new Date() }, OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: new Date() } }] },
    orderBy: [{ name: "asc" }, { version: "desc" }]
  });
}

export async function createRestructuringPolicy(prisma, { payload, actor }) {
  return prisma.$transaction(async (tx) => {
    const previous = await tx.restructuringPolicy.findFirst({
      where: { name: payload.name },
      orderBy: { version: "desc" }
    });
    if (previous) {
      await tx.restructuringPolicy.updateMany({
        where: { name: payload.name, active: true },
        data: { active: false, effectiveUntil: new Date(payload.effectiveFrom) }
      });
    }
    const policy = await tx.restructuringPolicy.create({
      data: { ...payload, effectiveFrom: new Date(payload.effectiveFrom), version: (previous?.version || 0) + 1, active: true }
    });
    await writeAudit(tx, {
      actorId: actor.id, action: "RESTRUCTURING_POLICY_CREATED",
      entityType: "RestructuringPolicy", entityId: policy.id,
      description: `Política de reestructuración ${policy.name} v${policy.version} creada`,
      metadata: { version: policy.version, overdueInstallmentsTreatment: policy.overdueInstallmentsTreatment,
        includeAccruedInterest: policy.includeAccruedInterest, lateInterestTreatment: policy.lateInterestTreatment }
    });
    return policy;
  });
}

export async function listRestructurings(prisma, { loanId, actor } = {}) {
  const where = loanId ? { loanId } : {};
  if (actor?.role === "comite_supervisor") where.status = "PENDING_COMMITTEE_REVIEW";
  if (actor?.role === "CREDIT_OFFICER") where.loan = { application: { assignedOfficerId: actor.id } };
  return prisma.loanRestructuring.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { policy: true }
  });
}

export async function requestRestructuring(prisma, { loanId, payload, actor, now = new Date() }) {
  return prisma.$transaction(async (tx) => {
    const [loan, policy] = await Promise.all([
      tx.loan.findUnique({ where: { id: loanId }, include: { application: { select: { assignedOfficerId: true } } } }),
      tx.restructuringPolicy.findUnique({ where: { id: payload.policyId } })
    ]);
    if (!loan) throw httpError(404, "Préstamo no encontrado.");
    if (actor.role === "CREDIT_OFFICER" && loan.application?.assignedOfficerId !== actor.id) throw httpError(404, "Préstamo no encontrado.");
    if (loan.status !== "ACTIVE") throw httpError(409, "Solo se puede reestructurar un préstamo activo.");
    if (!policy || !policy.active || policy.effectiveFrom > now || (policy.effectiveUntil && policy.effectiveUntil <= now)) {
      throw httpError(409, "No existe una política de reestructuración vigente.");
    }
    if (!POLICY_MODES.includes(policy.overdueInstallmentsTreatment)) throw httpError(409, "La política de cuotas vencidas no es válida.");

    const priorCount = await tx.loanRestructuring.count({ where: { loanId, status: "ACTIVE" } });
    const openCount = await tx.loanRestructuring.count({ where: { loanId, status: { in: ["PENDING_REVIEW", "PENDING_COMMITTEE_REVIEW", "PENDING_ACCEPTANCE"] } } });
    const historyCount = await tx.loanRestructuring.count({ where: { loanId } });
    if (openCount > 0) throw httpError(409, "El préstamo ya tiene una reestructuración en trámite.");
    if (priorCount > 0 && (!policy.allowRepeatedRestructuring || priorCount >= policy.maximumRestructurings)) {
      throw httpError(409, "El préstamo alcanzó el límite de reestructuraciones permitido por la política.");
    }

    const schedules = await tx.paymentSchedule.findMany({
      where: { loanId, isCurrent: true },
      orderBy: { installment: "asc" }
    });
    if (!schedules.length) throw httpError(409, "El préstamo no tiene un cronograma vigente.");
    const payments = await tx.payment.findMany({ where: { loanId, status: "CONFIRMED" } });
    const overdue = schedules.filter((row) => daysOverdue(row.dueDate, now) > 0 && outstanding(row) > 0);
    const overdueBalance = overdue.reduce((total, row) => total + outstanding(row), 0);
    if (policy.overdueInstallmentsTreatment === "REQUIRE_PAYMENT" && overdueBalance > 0) {
      throw httpError(409, "La política exige pagar las cuotas vencidas antes de reestructurar.");
    }

    const annualRate = payload.annualRate ?? loan.annualRate;
    if (!policy.allowRateChange && annualRate !== loan.annualRate) {
      throw httpError(409, "La política no permite modificar la tasa de interés.");
    }
    if (annualRate > policy.maximumUsuryRate) throw httpError(400, "La tasa propuesta supera el límite máximo configurado.");
    if (payload.termMonths > policy.maximumTermMonths) throw httpError(400, "El plazo propuesto supera el máximo de la política.");
    if (payload.gracePeriodDays > policy.maximumGracePeriodDays) throw httpError(400, "El período de gracia supera el máximo de la política.");

    const firstDueDate = new Date(payload.firstDueDate);
    if (firstDueDate <= now) throw httpError(400, "El primer vencimiento debe ser posterior a la fecha de solicitud.");
    const standardFirstDueDate = addMonths(now, 1);
    const actualGraceDays = daysOverdue(standardFirstDueDate, firstDueDate);
    if (actualGraceDays < 0 || actualGraceDays !== payload.gracePeriodDays) {
      throw httpError(400, "La fecha del primer vencimiento debe corresponder al primer vencimiento mensual más el período de gracia indicado.");
    }
    if (policy.lateInterestTreatment === "MANUAL_CAPITALIZE" && payload.lateInterestAmount > 0 && !payload.lateInterestEvidence) {
      throw httpError(400, "El valor manual de intereses de mora requiere soporte o referencia contable.");
    }
    const balance = calculateRestructuringBalance({
      schedules, payments,
      includeAccruedInterest: policy.includeAccruedInterest,
      lateInterestTreatment: policy.lateInterestTreatment,
      lateInterestAmount: payload.lateInterestAmount,
      asOf: now
    });
    if (balance.newPrincipal <= 0) throw httpError(409, "El saldo calculado no permite generar una reestructuración.");

    const restructuring = await tx.loanRestructuring.create({
      data: {
        loanId, policyId: policy.id, version: historyCount + 1,
        status: "PENDING_REVIEW", reason: payload.reason,
        requestedById: actor.id, principalOutstanding: balance.principalOutstanding,
        accruedInterestOutstanding: balance.accruedInterestOutstanding,
        includedInterest: balance.includedInterest, lateInterestAmount: balance.lateInterestAmount,
        ...(payload.lateInterestEvidence ? { lateInterestEvidence: payload.lateInterestEvidence } : {}),
        waivedInterest: balance.waivedInterest, newPrincipal: balance.newPrincipal,
        previousAnnualRate: loan.annualRate, proposedAnnualRate: annualRate,
        previousTermMonths: loan.termMonths, proposedTermMonths: payload.termMonths,
        gracePeriodDays: payload.gracePeriodDays, firstDueDate: new Date(payload.firstDueDate),
        overdueBalance, createdAt: now
      }
    });
    await writeAudit(tx, {
      actorId: actor.id, action: "LOAN_RESTRUCTURING_REQUESTED",
      entityType: "Loan", entityId: loanId,
      description: `Solicitud de reestructuración v${restructuring.version} registrada`,
      metadata: { restructuringId: restructuring.id, policyId: policy.id, balance, overdueBalance }
    });
    return restructuring;
  });
}

export async function decideRestructuring(prisma, { restructuringId, outcome, justification, actor }) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.loanRestructuring.findUnique({ where: { id: restructuringId }, include: { policy: true, loan: true } });
    if (!item) throw httpError(404, "Reestructuración no encontrada.");
    if (item.loan.status !== "ACTIVE") throw httpError(409, "El préstamo dejó de estar activo y no admite reestructuración.");
    if (item.status !== "PENDING_REVIEW" && item.status !== "PENDING_COMMITTEE_REVIEW") {
      throw httpError(409, "La reestructuración no está pendiente de decisión.");
    }
    const escalated = item.newPrincipal > item.policy.maximumOfficerApprovalAmount;
    const isCommittee = actor.role === "comite_supervisor";
    if (item.status === "PENDING_REVIEW" && isCommittee) {
      throw httpError(403, "El comité solo interviene en propuestas escaladas.");
    }
    if (outcome === "APPROVED" && escalated && !isCommittee) {
      await tx.loanRestructuring.update({ where: { id: restructuringId }, data: { status: "PENDING_COMMITTEE_REVIEW", decision: "ESCALATED", justification, reviewedById: actor.id, decidedAt: new Date() } });
      await writeAudit(tx, {
        actorId: actor.id, action: "RESTRUCTURING_ESCALATED",
        entityType: "LoanRestructuring", entityId: restructuringId,
        description: "La propuesta supera el límite de aprobación del oficial y fue escalada al comité",
        metadata: { amount: item.newPrincipal, limit: item.policy.maximumOfficerApprovalAmount }
      });
      return { id: restructuringId, status: "PENDING_COMMITTEE_REVIEW", escalated: true };
    }
    if (item.status === "PENDING_COMMITTEE_REVIEW" && !isCommittee) {
      throw httpError(403, "Esta reestructuración requiere decisión del comité.");
    }
    if (outcome === "REJECTED") {
      const rejected = await tx.loanRestructuring.update({
        where: { id: restructuringId },
        data: { status: "REJECTED", decision: outcome, justification, reviewedById: actor.id, decidedAt: new Date() }
      });
      await writeAudit(tx, {
        actorId: actor.id, action: "LOAN_RESTRUCTURING_REJECTED",
        entityType: "LoanRestructuring", entityId: restructuringId,
        description: "Reestructuración rechazada", metadata: { justification }
      });
      return rejected;
    }
    const approved = await tx.loanRestructuring.update({
      where: { id: restructuringId },
      data: { status: "PENDING_ACCEPTANCE", decision: outcome, justification, reviewedById: actor.id, decidedAt: new Date() }
    });
    await writeAudit(tx, {
      actorId: actor.id, action: "LOAN_RESTRUCTURING_APPROVED",
      entityType: "LoanRestructuring", entityId: restructuringId,
      description: "Reestructuración aprobada; pendiente de aceptación del asociado",
      metadata: { justification, escalated }
    });
    return approved;
  });
}

export async function acceptRestructuring(prisma, { restructuringId, acceptanceMethod, acceptanceEvidence, actor, now = new Date() }) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.loanRestructuring.findUnique({ where: { id: restructuringId }, include: { loan: true, policy: true } });
    if (!item) throw httpError(404, "Reestructuración no encontrada.");
    if (item.status !== "PENDING_ACCEPTANCE") throw httpError(409, "La reestructuración no está pendiente de aceptación.");
    if (item.firstDueDate <= now) throw httpError(409, "El primer vencimiento debe ser posterior a la fecha de activación.");

    const currentSchedules = await tx.paymentSchedule.findMany({
      where: { loanId: item.loanId, isCurrent: true },
      orderBy: { installment: "asc" }
    });
    if (!currentSchedules.length) throw httpError(409, "No existe un cronograma vigente para reemplazar.");
    const nextVersion = Math.max(0, ...currentSchedules.map((row) => row.scheduleVersion || 1)) + 1;
    const schedule = buildSchedule({
      principal: item.newPrincipal,
      annualRatePercent: item.proposedAnnualRate,
      termMonths: item.proposedTermMonths,
      disbursementDate: addMonths(item.firstDueDate, -1)
    });

    const changed = await tx.loan.updateMany({
      where: { id: item.loanId, status: "ACTIVE", updatedAt: item.loan.updatedAt },
      data: { principal: item.newPrincipal, annualRate: item.proposedAnnualRate, termMonths: item.proposedTermMonths }
    });
    if (changed.count !== 1) throw httpError(409, "El préstamo cambió durante la aceptación. Recarga e intenta nuevamente.");

    await tx.alert.updateMany({
      where: { loanId: item.loanId, status: "UNREAD", schedule: { isCurrent: true } },
      data: { status: "CANCELLED", readAt: now }
    });
    await tx.paymentSchedule.updateMany({
      where: { loanId: item.loanId, isCurrent: true },
      data: { isCurrent: false }
    });
    await tx.paymentSchedule.createMany({
      data: schedule.map((row) => ({ loanId: item.loanId, ...row, scheduleVersion: nextVersion, isCurrent: true }))
    });
    const activated = await tx.loanRestructuring.update({
      where: { id: restructuringId },
      data: {
        status: "ACTIVE", acceptanceMethod, acceptanceEvidence,
        acceptedById: actor.id, acceptedAt: now, scheduleVersion: nextVersion, activatedAt: now
      }
    });
    await writeAudit(tx, {
      actorId: actor.id, action: "LOAN_RESTRUCTURED",
      entityType: "Loan", entityId: item.loanId,
      description: `Reestructuración v${item.version} activada; cronograma v${nextVersion} generado`,
      metadata: { restructuringId, previousScheduleVersion: nextVersion - 1, scheduleVersion: nextVersion,
        principal: item.newPrincipal, annualRate: item.proposedAnnualRate, termMonths: item.proposedTermMonths,
        firstDueDate: item.firstDueDate, acceptanceMethod }
    });
    return { restructuring: activated, schedule };
  });
}
