import { applicationTransitions, assertTransition } from "../domain/states.js";
import { httpError } from "../utils/httpError.js";
import { writeAudit } from "./audit.service.js";

// Estados que son una decisión del funcionario: exigen justificación (ADR-004) y generan un LoanDecision.
export const DECISION_STATES = Object.freeze(["APPROVED", "REJECTED"]);

// Cambia el estado de una solicitud respetando las transiciones permitidas.
// Todo ocurre en UNA transacción: cambio de estado + decisión (si aplica) + registro de auditoría.
// `prisma` se recibe como parámetro para poder probar el servicio sin base de datos.
export async function changeApplicationStatus(prisma, { applicationId, toStatus, actor, justification, note }) {
  const isDecision = DECISION_STATES.includes(toStatus);
  if (isDecision && !justification?.trim()) {
    throw httpError(400, "Toda decisión de aprobar o rechazar requiere una justificación.");
  }

  return prisma.$transaction(async (tx) => {
    const application = await tx.loanApplication.findUnique({
      where: { id: applicationId },
      select: { id: true, status: true }
    });
    if (!application) throw httpError(404, "Solicitud no encontrada.");

    assertTransition(applicationTransitions, application.status, toStatus, "Solicitud");

    // Cambio condicionado al estado leído: si otro usuario la cambió en paralelo, no se pisa en silencio.
    const updated = await tx.loanApplication.updateMany({
      where: { id: applicationId, status: application.status },
      data: { status: toStatus }
    });
    if (updated.count !== 1) {
      throw httpError(409, "La solicitud cambió mientras se procesaba. Recarga e intenta de nuevo.");
    }

    let decisionId = null;
    if (isDecision) {
      const decision = await tx.loanDecision.create({
        data: {
          applicationId,
          officerId: actor.id,
          outcome: toStatus,
          justification: justification.trim()
        }
      });
      decisionId = decision.id;
    }

    await writeAudit(tx, {
      actorId: actor.id,
      action: "APPLICATION_STATUS_CHANGED",
      entityType: "LoanApplication",
      entityId: applicationId,
      description: `Solicitud pasó de ${application.status} a ${toStatus}`,
      metadata: {
        from: application.status,
        to: toStatus,
        ...(justification ? { justification: justification.trim() } : {}),
        ...(note ? { note: note.trim() } : {}),
        ...(decisionId ? { decisionId } : {})
      }
    });

    return { id: applicationId, previousStatus: application.status, status: toStatus, decisionId };
  });
}
