import { evaluate } from "../domain/evaluation.js";
import { httpError } from "../utils/httpError.js";
import { writeAudit } from "./audit.service.js";
import { findActivePolicy } from "./policy.service.js";

// Evalúa una solicitud en revisión contra una política configurable y guarda el resultado con la
// política y versión usadas (ADR-003). La evaluación es un apoyo: NO cambia el estado de la solicitud.
export async function evaluateApplication(prisma, { applicationId, actor, policyId, now = new Date() }) {
  return prisma.$transaction(async (tx) => {
    const application = await tx.loanApplication.findUnique({
      where: { id: applicationId },
      include: { applicant: true }
    });
    if (!application) throw httpError(404, "Solicitud no encontrada.");
    if (application.status !== "UNDER_REVIEW") {
      throw httpError(409, `La solicitud debe estar en revisión (UNDER_REVIEW) para evaluarla. Estado actual: ${application.status}.`);
    }

    let policy;
    if (policyId) {
      policy = await tx.creditPolicy.findUnique({ where: { id: policyId } });
      if (!policy || !policy.active) throw httpError(404, "La política indicada no existe o no está activa.");
    } else {
      policy = await findActivePolicy(tx, now);
      if (!policy) {
        throw httpError(409, "No hay una política de crédito activa. Un administrador debe crearla (POST /api/policies) con los valores confirmados por el Product Owner.");
      }
    }

    const result = evaluate({ applicant: application.applicant, application, policy, today: now });

    const evaluation = await tx.riskEvaluation.create({
      data: {
        applicationId,
        policyId: policy.id,
        monthlyIncome: application.applicant.monthlyIncome ?? 0,
        monthlyExpenses: application.applicant.monthlyExpenses ?? 0,
        existingObligations: application.applicant.monthlyDebtPayments ?? 0,
        estimatedInstallment: result.estimatedInstallment,
        debtToIncomeRatio: result.debtToIncomeRatio,
        indicators: result.indicators,
        result: result.recommendation,
        observations: result.observations
      }
    });

    await writeAudit(tx, {
      actorId: actor.id,
      action: "RISK_EVALUATED",
      entityType: "LoanApplication",
      entityId: applicationId,
      description: `Evaluación con política "${policy.name}" v${policy.version}: ${result.recommendation}`,
      metadata: { evaluationId: evaluation.id, policyId: policy.id, policyVersion: policy.version, recommendation: result.recommendation }
    });

    return { ...evaluation, policy: { id: policy.id, name: policy.name, version: policy.version } };
  });
}
