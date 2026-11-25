import { buildSchedule, addMonths } from "../domain/finance.js";
import { outstanding } from "../domain/payments.js";
import { calculateGraceDays, calculateRestructuringBalance } from "../domain/restructuring.js";
import { loanTransitions, assertTransition } from "../domain/states.js";
import { writeAudit } from "./audit.service.js";
import { httpError } from "../utils/httpError.js";

const POLICY_MODES = ["CAPITALIZE", "REQUIRE_PAYMENT"];

export async function listRestructuringPolicies(prisma) {
  return prisma.restructuringPolicy.findMany({
    where: { active: true, effectiveFrom: { lte: new Date() } },
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

export async function listRestructurings(prisma, { loanId } = {}) {
  return prisma.loanRestructuring.findMany({
    where: loanId ? { loanId } : {},
    orderBy: { createdAt: "desc" },
    include: { policy: true }
  });
}

export async function requestRestructuring(prisma, { loanId, payload, actor, now = new Date() }) {
  return prisma.$transaction(async (tx) => {
    const [loan, policy] = await Promise.all([
      tx.loan.findUnique({ where: { id: loanId } }),
      tx.restructuringPolicy.findUnique({ where: { id: payload.policyId } })
    ]);
    if (!loan) throw httpError(404, "Préstamo no encontrado.");
    if (loan.status !== "ACTIVE") throw httpError(409, "Solo se puede reestructurar un préstamo activo.");
    if (!policy || !policy.active || policy.effectiveFrom > now || (policy.effectiveUntil && policy.effectiveUntil <= now)) {
      throw httpError(409, "No existe una política de reestructuración vigente.");
    }
    if (!POLICY_MODES.includes(policy.overdueInstallmentsTreatment)) throw httpError(409, "La política de cuotas vencidas no es válida.");

    const priorCount = await tx.loanRestructuring.count({ where: { loanId, status: "ACTIVE" } });
    if (priorCount > 0 && (!policy.allowRepeatedRestructuring || priorCount >= policy.maximumRestructurings)) {
      throw httpError(409, "El préstamo alcanzó el límite de reestructuraciones permitido por la política.");
    }

    const schedules = await tx.paymentSchedule.findMany({
      where: { loanId, isCurrent: true },
      orderBy: { installment: "asc" }
    });
    if (!schedules.length) throw httpError(409, "El préstamo no tiene un cronograma vigente.");
    const payments = await tx.payment.findMany({ where: { loanId, status: "CONFIRMED" } });
    const overdue = schedules.filter((row) => new Date(row.dueDate) < now && outstanding(row) > 0);
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

    const graceDays = calculateGraceDays(now, payload.firstDueDate);
    if (graceDays > payload.gracePeriodDays) {
      throw httpError(400, "La fecha del primer vencimiento excede el período de gracia indicado.");
    }
    const balance = calculateRestructuringBalance({
      schedules, payments,
      includeAccruedInterest: policy.includeAccruedInterest,
      lateInterestTreatment: policy.lateInterestTreatment,
      lateInterestAmount: payload.lateInterestAmount
    });
    if (balance.newPrincipal <= 0) throw httpError(409, "El saldo calculado no permite generar una reestructuración.");

    const restructuring = await tx.loanRestructuring.create({
      data: {
        loanId, policyId: policy.id, version: priorCount + 1,
        status: "PENDING_REVIEW", reason: payload.reason,
        requestedById: actor.id, principalOutstanding: balance.principalOutstanding,
        accruedInterestOutstanding: balance.accruedInterestOutstanding,
        includedInterest: balance.includedInterest, lateInterestAmount: balance.lateInterestAmount,
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
    if (item.status !== "PENDING_REVIEW" && item.status !== "PENDING_COMMITTEE_REVIEW") {
      throw httpError(409, "La reestructuración no está pendiente de decisión.");
    }
    const escalated = item.newPrincipal > item.policy.maximumOfficerApprovalAmount;
    const isCommittee = actor.role === "comite_supervisor";
    if (escalated && !isCommittee) {
      await tx.loanRestructuring.update({ where: { id: restructuringId }, data: { status: "PENDING_COMMITTEE_REVIEW" } });
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
