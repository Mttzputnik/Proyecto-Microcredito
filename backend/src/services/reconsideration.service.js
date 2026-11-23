import { httpError } from "../utils/httpError.js";
import { matchesTrackingToken } from "./applicationTracking.service.js";
import { selectOfficerByWorkload } from "./applicationAssignment.service.js";
import { writeAudit } from "./audit.service.js";

const ACTIVE_APPLICATION_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "NEEDS_INFORMATION"];

async function selectReconsiderationOfficer(tx, originalOfficerId) {
  const officers = await tx.user.findMany({
    where: { role: "CREDIT_OFFICER", active: true, id: { not: originalOfficerId } },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: "asc" }
  });
  if (!officers.length) throw httpError(409, "No hay otro oficial activo disponible para reconsiderar esta solicitud.");

  const officerIds = officers.map((officer) => officer.id);
  const assignedApplications = await tx.loanApplication.findMany({
    where: { assignedOfficerId: { in: officerIds } },
    select: { assignedOfficerId: true, assignedAt: true, createdAt: true, status: true }
  });
  const selected = selectOfficerByWorkload(officers, assignedApplications);
  if (!selected) throw httpError(409, "No fue posible asignar un oficial diferente.");
  return selected.officer.id;
}

export async function submitReconsideration(prisma, { applicationNumber, accessToken, applicantMessage }) {
  try {
    return await prisma.$transaction(async (tx) => {
      const application = await tx.loanApplication.findUnique({
        where: { applicationNumber },
        select: {
          id: true, status: true,
          trackingCredential: { select: { tokenHash: true, revokedAt: true } },
          decisions: {
            where: { outcome: "REJECTED" },
            orderBy: { decidedAt: "desc" },
            take: 1,
            select: { id: true, officerId: true }
          }
        }
      });

      if (!application?.trackingCredential ||
          application.trackingCredential.revokedAt ||
          !matchesTrackingToken(accessToken, application.trackingCredential.tokenHash)) {
        throw httpError(404, "No fue posible validar los datos de consulta.");
      }
      if (application.status !== "REJECTED" || !application.decisions.length) {
        throw httpError(409, "Solo se puede reconsiderar una solicitud que tenga una decisión de rechazo.");
      }
      const existing = await tx.reconsideration.findUnique({ where: { applicationId: application.id } });
      if (existing) throw httpError(409, "Esta solicitud ya utilizó su única reconsideración.");

      const originalDecision = application.decisions[0];
      const assignedOfficerId = await selectReconsiderationOfficer(tx, originalDecision.officerId);
      const reconsideration = await tx.reconsideration.create({
        data: {
          applicationId: application.id,
          originalDecisionId: originalDecision.id,
          originalOfficerId: originalDecision.officerId,
          assignedOfficerId,
          applicantMessage: applicantMessage.trim(),
          status: "PENDING_REVIEW"
        },
        select: { id: true, status: true, submittedAt: true, assignedOfficerId: true }
      });

      await writeAudit(tx, {
        actorId: null,
        action: "APPLICATION_RECONSIDERATION_SUBMITTED",
        entityType: "LoanApplication",
        entityId: application.id,
        description: "El solicitante presentó la única reconsideración permitida.",
        metadata: { reconsiderationId: reconsideration.id, assignedOfficerId }
      });
      return { id: reconsideration.id, status: reconsideration.status, submittedAt: reconsideration.submittedAt };
    });
  } catch (error) {
    if (error.code === "P2002") throw httpError(409, "Esta solicitud ya utilizó su única reconsideración.");
    throw error;
  }
}

export async function listAssignedReconsiderations(prisma, actor) {
  return prisma.reconsideration.findMany({
    where: { assignedOfficerId: actor.id },
    orderBy: { submittedAt: "asc" },
    include: {
      application: {
        select: {
          id: true, applicationNumber: true, status: true, requestedAmount: true, requestedTerm: true, purpose: true,
          applicantSnapshot: { select: { firstName: true, lastName: true, documentType: true, documentNumber: true } },
          decisions: {
            where: { id: { equals: undefined } },
            take: 0
          }
        }
      }
    }
  });
}

export async function decideReconsideration(prisma, { reconsiderationId, actor, outcome, justification }) {
  if (!["APPROVED", "REJECTED"].includes(outcome)) throw httpError(400, "El resultado de la reconsideración no es válido.");
  if (!justification?.trim() || justification.trim().length < 10) {
    throw httpError(400, "La decisión requiere una justificación de al menos 10 caracteres.");
  }

  return prisma.$transaction(async (tx) => {
    const reconsideration = await tx.reconsideration.findUnique({
      where: { id: reconsiderationId },
      select: { id: true, applicationId: true, originalOfficerId: true, assignedOfficerId: true, status: true }
    });
    if (!reconsideration || reconsideration.assignedOfficerId !== actor.id) {
      throw httpError(404, "Reconsideración no encontrada.");
    }
    if (actor.id === reconsideration.originalOfficerId) {
      throw httpError(403, "El oficial que tomó la decisión original no puede reconsiderarla.");
    }
    if (reconsideration.status !== "PENDING_REVIEW") {
      throw httpError(409, "La reconsideración ya fue resuelta.");
    }

    const decidedAt = new Date();
    const updated = await tx.reconsideration.updateMany({
      where: { id: reconsiderationId, status: "PENDING_REVIEW", assignedOfficerId: actor.id },
      data: { status: outcome, outcome, justification: justification.trim(), decidedAt }
    });
    if (updated.count !== 1) throw httpError(409, "La reconsideración cambió mientras se procesaba. Recarga e intenta de nuevo.");

    await writeAudit(tx, {
      actorId: actor.id,
      action: "APPLICATION_RECONSIDERATION_DECIDED",
      entityType: "LoanApplication",
      entityId: reconsideration.applicationId,
      description: `La reconsideración fue resuelta: ${outcome}.`,
      metadata: { reconsiderationId, outcome, justification: justification.trim(), decidedAt: decidedAt.toISOString() }
    });
    return { id: reconsiderationId, applicationId: reconsideration.applicationId, status: outcome, decidedAt };
  });
}
