import { evaluate } from "../domain/evaluation.js";
import { httpError } from "../utils/httpError.js";
import { writeAudit } from "./audit.service.js";
import { findActivePolicy } from "./policy.service.js";
import { extractPreviousDelinquencies } from "../domain/internalHistory.js";

const ACTIVE_LOAN_STATUSES = ["PENDING_DISBURSEMENT", "ACTIVE"];
async function loadInternalHistory(tx, applicantId, currentApplicationId, today) {
  const applications = await tx.loanApplication.findMany({
    where: { applicantId, id: { not: currentApplicationId } },
    select: { id: true, status: true, loan: { select: { id: true, loanNumber: true, status: true, paymentSchedules: {
      select: { dueDate: true, paidAt: true, totalDue: true, paidAmount: true, status: true }
    } } } }
  });
  const loans = applications.map((item) => item.loan).filter(Boolean);
  const activeLoans = loans.filter((loan) => ACTIVE_LOAN_STATUSES.includes(loan.status));
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const hasActiveDelinquency = activeLoans.some((loan) => loan.paymentSchedules.some((schedule) =>
    schedule.totalDue - (schedule.paidAmount ?? 0) > 0 &&
    (schedule.status === "OVERDUE" || Date.UTC(new Date(schedule.dueDate).getUTCFullYear(), new Date(schedule.dueDate).getUTCMonth(), new Date(schedule.dueDate).getUTCDate()) < todayUtc)));
  const previousDelinquencies = extractPreviousDelinquencies(loans);
  return {
    activeLoans: activeLoans.length,
    historicalApplications: applications.length,
    previousApprovedApplications: applications.filter((item) => item.status === "APPROVED").length,
    previousRejectedApplications: applications.filter((item) => item.status === "REJECTED").length,
    historicalLoans: loans.length,
    hasActiveDelinquency,
    previousDelinquencies
  };
}

export async function evaluateApplication(prisma, { applicationId, actor, policyId, now = new Date() }) {
  return prisma.$transaction(async (tx) => {
    const application = await tx.loanApplication.findUnique({
      where: { id: applicationId }, include: { applicant: true, applicantSnapshot: true, verification: true }
    });
    if (!application || application.assignedOfficerId !== actor.id) throw httpError(404, "Solicitud no encontrada.");
    if (application.status !== "UNDER_REVIEW") throw httpError(409, `La solicitud debe estar en revisión (UNDER_REVIEW) para evaluarla. Estado actual: ${application.status}.`);
    let policy;
    if (policyId) {
      policy = await tx.creditPolicy.findUnique({ where: { id: policyId } });
      if (!policy || !policy.active) throw httpError(404, "La política indicada no existe o no está activa.");
    } else {
      policy = await findActivePolicy(tx, now);
      if (!policy) throw httpError(409, "No hay una política de crédito activa.");
    }
    const applicantData = application.applicantSnapshot ?? application.applicant;
    const internalHistory = await loadInternalHistory(tx, application.applicantId, application.id, now);
    const result = evaluate({ applicant: applicantData, application, policy, internalHistory,
      residenceVerification: application.verification, today: now });
    const evaluation = await tx.riskEvaluation.create({ data: {
      applicationId, policyId: policy.id, monthlyIncome: applicantData.monthlyIncome ?? 0,
      monthlyExpenses: applicantData.monthlyExpenses ?? 0, existingObligations: applicantData.monthlyDebtPayments ?? 0,
      estimatedInstallment: result.estimatedInstallment, debtToIncomeRatio: result.debtToIncomeRatio,
      indicators: result.indicators, result: result.recommendation, observations: result.observations
    }});
    await writeAudit(tx, { actorId: actor.id, action: "RISK_EVALUATED", entityType: "LoanApplication", entityId: applicationId,
      description: `Evaluación con política "${policy.name}" v${policy.version}: ${result.recommendation}`,
      metadata: { evaluationId: evaluation.id, policyId: policy.id, policyVersion: policy.version, recommendation: result.recommendation } });
    return { ...evaluation, policy: { id: policy.id, name: policy.name, version: policy.version } };
  });
}

export async function verifyApplicationResidence(prisma, { applicationId, actor, verified, notes }) {
  return prisma.$transaction(async (tx) => {
    const application = await tx.loanApplication.findFirst({
      where: { id: applicationId, assignedOfficerId: actor.id }, select: { id: true, status: true }
    });
    if (!application) throw httpError(404, "Solicitud no encontrada.");
    if (!["UNDER_REVIEW", "NEEDS_INFORMATION"].includes(application.status))
      throw httpError(409, "La residencia solo se puede verificar durante la revisión de la solicitud.");
    const verification = await tx.applicationVerification.upsert({
      where: { applicationId },
      create: { applicationId, verified, notes: notes.trim(), verifiedById: actor.id },
      update: { verified, notes: notes.trim(), verifiedById: actor.id, verifiedAt: new Date() },
      include: { verifiedBy: { select: { firstName: true, lastName: true } } }
    });
    await writeAudit(tx, { actorId: actor.id, action: "RESIDENCE_VERIFIED", entityType: "LoanApplication", entityId: applicationId,
      description: `Verificación de residencia: ${verified ? "confirmada" : "no confirmada"}`,
      metadata: { verified, notes: notes.trim(), verificationId: verification.id } });
    return verification;
  });
}
