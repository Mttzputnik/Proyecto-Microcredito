import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { PERMISSIONS } from "../domain/roles.js";
import { applicationTransitions } from "../domain/states.js";
import { changeApplicationStatus } from "../services/applicationStatus.service.js";
import { changeStatusSchema, listApplicationsQuery } from "../validators/management.validator.js";
import { parseOrThrow, requireObjectId, httpError } from "../utils/httpError.js";
const router = Router();
router.use(authenticate);
const applicantSummary = { id: true, firstName: true, lastName: true, documentType: true, documentNumber: true };
router.get("/", authorize(...PERMISSIONS.readApplications), async (req, res) => {
  const { status, page, limit } = parseOrThrow(listApplicationsQuery, req.query, "Los filtros no son válidos.");
  const where = { assignedOfficerId: req.user.id, ...(status ? { status } : {}) };
  const [total, items] = await Promise.all([
    prisma.loanApplication.count({ where }),
    prisma.loanApplication.findMany({
      where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit,
      select: { id: true, applicationNumber: true, requestedAmount: true, requestedTerm: true, purpose: true,
        status: true, createdAt: true, applicant: { select: applicantSummary },
        applicantSnapshot: { select: { firstName: true, lastName: true, documentType: true, documentNumber: true, municipality: true, phone: true } },
        assignedOfficer: { select: { id: true, firstName: true, lastName: true } } }
    })
  ]);
  res.json({ success: true, data: items.map(({ applicant, applicantSnapshot, ...item }) => ({ ...item, applicant: applicantSnapshot ?? applicant })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});
router.get("/:id", authorize(...PERMISSIONS.readApplications), async (req, res) => {
  const id = requireObjectId(req.params.id);
  const application = await prisma.loanApplication.findFirst({
    where: { id, assignedOfficerId: req.user.id },
    include: { applicant: true, applicantSnapshot: true, verification: true,
      assignedOfficer: { select: { id: true, firstName: true, lastName: true } },
      loan: { select: { id: true, loanNumber: true, status: true } },
      evaluations: { orderBy: { evaluatedAt: "desc" }, take: 5 },
      decisions: { orderBy: { decidedAt: "desc" }, include: { officer: { select: { id: true, firstName: true, lastName: true } } } },
      reconsideration: { include: { assignedOfficer: { select: { id: true, firstName: true, lastName: true } } } }
    }
  });
  if (!application) throw httpError(404, "Solicitud no encontrada.");
  res.json({ success: true, data: { ...application, applicant: application.applicantSnapshot ?? application.applicant,
    allowedNextStatuses: applicationTransitions[application.status] ?? [] } });
});
router.patch("/:id/status", authorize(...PERMISSIONS.changeApplicationStatus), async (req, res) => {
  const applicationId = requireObjectId(req.params.id);
  const { status, justification, conditions, note } = parseOrThrow(changeStatusSchema, req.body);
  const result = await changeApplicationStatus(prisma, { applicationId, toStatus: status, actor: req.user, justification, conditions, note });
  res.json({ success: true, message: "Estado actualizado.", data: result });
});
router.get("/:id/history", authorize(...PERMISSIONS.readApplications), async (req, res) => {
  const id = requireObjectId(req.params.id);
  const assigned = await prisma.loanApplication.findFirst({ where: { id, assignedOfficerId: req.user.id }, select: { id: true } });
  if (!assigned) throw httpError(404, "Solicitud no encontrada.");
  const events = await prisma.auditLog.findMany({
    where: { entityType: "LoanApplication", entityId: id },
    orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
    // El oficial necesita actor, acción y fecha; los metadatos internos se reservan
    // para la consulta administrativa de auditoría.
    select: { id: true, actorId: true, action: true, entityType: true, entityId: true, description: true, occurredAt: true }
  });
  res.json({ success: true, data: events });
});
export default router;
