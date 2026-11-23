import { applicationTransitions, assertTransition } from "../domain/states.js";
import { httpError } from "../utils/httpError.js";
import { writeAudit } from "./audit.service.js";
export const DECISION_STATES = Object.freeze(["APPROVED", "APPROVED_WITH_CONDITIONS", "REJECTED"]);
export async function changeApplicationStatus(prisma, { applicationId, toStatus, actor, justification, conditions, note }) {
  const isDecision = DECISION_STATES.includes(toStatus);
  if (isDecision && (!justification?.trim() || justification.trim().length < 10))
    throw httpError(400, "Toda decisión requiere una justificación de al menos 10 caracteres.");
  if (toStatus === "APPROVED_WITH_CONDITIONS" && (!conditions?.trim() || conditions.trim().length < 10))
    throw httpError(400, "La aprobación condicionada requiere condiciones de al menos 10 caracteres.");
  return prisma.$transaction(async (tx) => {
    const application = await tx.loanApplication.findUnique({
      where: { id: applicationId }, select: { id: true, status: true, assignedOfficerId: true, loan: { select: { id: true } } }
    });
    if (!application || application.assignedOfficerId !== actor.id) throw httpError(404, "Solicitud no encontrada.");
    assertTransition(applicationTransitions, application.status, toStatus, "Solicitud");
    if (toStatus === "CANCELLED" && application.loan) throw httpError(409, "La solicitud ya tiene un préstamo formalizado y no se puede cancelar.");
    const updated = await tx.loanApplication.updateMany({
      where: { id: applicationId, status: application.status }, data: { status: toStatus }
    });
    if (updated.count !== 1) throw httpError(409, "La solicitud cambió mientras se procesaba. Recarga e intenta de nuevo.");
    let decisionId = null;
    if (isDecision) {
      const decision = await tx.loanDecision.create({ data: {
        applicationId, officerId: actor.id, outcome: toStatus, justification: justification.trim(),
        ...(conditions ? { conditions: conditions.trim() } : {})
      }});
      decisionId = decision.id;
    }
    await writeAudit(tx, {
      actorId: actor.id, action: "APPLICATION_STATUS_CHANGED", entityType: "LoanApplication", entityId: applicationId,
      description: `Solicitud pasó de ${application.status} a ${toStatus}`,
      metadata: { from: application.status, to: toStatus,
        ...(justification ? { justification: justification.trim() } : {}),
        ...(conditions ? { conditions: conditions.trim() } : {}),
        ...(note ? { note: note.trim() } : {}), ...(decisionId ? { decisionId } : {}) }
    });
    return { id: applicationId, previousStatus: application.status, status: toStatus, decisionId };
  });
}
