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
    if (application.status === "APPROVED_WITH_CONDITIONS" && toStatus === "APPROVED") {
      throw httpError(409, "La aprobación condicionada solo puede habilitarse mediante la verificación de condiciones.");
    }
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
      if (toStatus === "APPROVED_WITH_CONDITIONS") {
        await tx.conditionalApproval.create({ data: {
          applicationId, decisionId: decision.id, conditions: conditions.trim(), status: "PENDING"
        } });
      }
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


// Verifica el cumplimiento de las condiciones antes de habilitar la formalización.
export async function verifyConditionalApproval(prisma, { applicationId, actor, notes, now = new Date() }) {
  return prisma.$transaction(async (tx) => {
    const application = await tx.loanApplication.findUnique({
      where: { id: applicationId },
      select: { id: true, status: true, assignedOfficerId: true, loan: { select: { id: true } } }
    });
    if (!application || application.assignedOfficerId !== actor.id) throw httpError(404, "Solicitud no encontrada.");
    if (application.status !== "APPROVED_WITH_CONDITIONS") throw httpError(409, "La solicitud no está pendiente de cumplimiento de condiciones.");
    if (application.loan) throw httpError(409, "La solicitud ya tiene un préstamo formalizado.");
    const conditional = await tx.conditionalApproval.findUnique({ where: { applicationId } });
    if (!conditional || conditional.status !== "PENDING") throw httpError(409, "No existe una aprobación condicionada pendiente de verificar.");
    const verified = await tx.conditionalApproval.updateMany({
      where: { id: conditional.id, status: "PENDING" },
      data: { status: "VERIFIED", verificationNotes: notes.trim(), verifiedById: actor.id, verifiedAt: now }
    });
    if (verified.count !== 1) throw httpError(409, "Las condiciones cambiaron durante la verificación. Recarga e intenta nuevamente.");
    const changed = await tx.loanApplication.updateMany({
      where: { id: applicationId, status: "APPROVED_WITH_CONDITIONS" }, data: { status: "APPROVED" }
    });
    if (changed.count !== 1) throw httpError(409, "La solicitud cambió durante la verificación. Recarga e intenta nuevamente.");
    await writeAudit(tx, {
      actorId: actor.id, action: "CONDITIONAL_APPROVAL_VERIFIED", entityType: "LoanApplication", entityId: applicationId,
      description: "Se verificó el cumplimiento de las condiciones y la solicitud quedó habilitada para formalización.",
      metadata: { conditionalApprovalId: conditional.id, decisionId: conditional.decisionId, verifiedAt: now.toISOString() }
    });
    await writeAudit(tx, {
      actorId: actor.id, action: "APPLICATION_STATUS_CHANGED", entityType: "LoanApplication", entityId: applicationId,
      description: "Solicitud pasó de APPROVED_WITH_CONDITIONS a APPROVED",
      metadata: { from: "APPROVED_WITH_CONDITIONS", to: "APPROVED", conditionalApprovalId: conditional.id }
    });
    return { applicationId, status: "APPROVED", conditionalApprovalStatus: "VERIFIED", verifiedAt: now };
  });
}
