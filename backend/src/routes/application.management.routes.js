import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { PERMISSIONS } from "../domain/roles.js";
import { applicationTransitions } from "../domain/states.js";
import { changeApplicationStatus } from "../services/applicationStatus.service.js";
import { changeStatusSchema, listApplicationsQuery } from "../validators/management.validator.js";
import { parseOrThrow, requireObjectId, httpError } from "../utils/httpError.js";

// Se monta en /api/applications DESPUÉS del router público (que solo maneja POST /).
// Todo lo de aquí exige sesión: contiene datos personales.
const router = Router();
router.use(authenticate);

const applicantSummary = { id: true, firstName: true, lastName: true, documentType: true, documentNumber: true };

// GET /api/applications?status=SUBMITTED&page=1&limit=20
router.get("/", authorize(...PERMISSIONS.readApplications), async (req, res) => {
  const { status, page, limit } = parseOrThrow(listApplicationsQuery, req.query, "Los filtros no son válidos.");
  const where = status ? { status } : {};

  const [total, items] = await Promise.all([
    prisma.loanApplication.count({ where }),
    prisma.loanApplication.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        applicationNumber: true,
        requestedAmount: true,
        requestedTerm: true,
        purpose: true,
        status: true,
        createdAt: true,
        applicant: { select: applicantSummary },
        assignedOfficer: { select: { id: true, firstName: true, lastName: true } }
      }
    })
  ]);

  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

// GET /api/applications/:id  (detalle + decisiones + estados siguientes permitidos)
router.get("/:id", authorize(...PERMISSIONS.readApplications), async (req, res) => {
  const id = requireObjectId(req.params.id);
  const application = await prisma.loanApplication.findUnique({
    where: { id },
    include: {
      applicant: true,
      assignedOfficer: { select: { id: true, firstName: true, lastName: true } },
      loan: { select: { id: true, loanNumber: true, status: true } },
      evaluations: { orderBy: { evaluatedAt: "desc" }, take: 5 },
      decisions: {
        orderBy: { decidedAt: "desc" },
        include: { officer: { select: { id: true, firstName: true, lastName: true } } }
      }
    }
  });
  if (!application) throw httpError(404, "Solicitud no encontrada.");

  res.json({
    success: true,
    data: { ...application, allowedNextStatuses: applicationTransitions[application.status] ?? [] }
  });
});

// PATCH /api/applications/:id/status  { status, justification?, note? }
// APPROVED y REJECTED exigen justificación y generan una decisión registrada.
router.patch("/:id/status", authorize(...PERMISSIONS.changeApplicationStatus), async (req, res) => {
  const applicationId = requireObjectId(req.params.id);
  const { status, justification, note } = parseOrThrow(changeStatusSchema, req.body);

  const result = await changeApplicationStatus(prisma, {
    applicationId,
    toStatus: status,
    actor: req.user,
    justification,
    note
  });
  res.json({ success: true, message: "Estado actualizado.", data: result });
});

// GET /api/applications/:id/history  (trazabilidad: quién cambió qué y cuándo)
router.get("/:id/history", authorize(...PERMISSIONS.readApplications), async (req, res) => {
  const id = requireObjectId(req.params.id);
  const events = await prisma.auditLog.findMany({
    where: { entityType: "LoanApplication", entityId: id },
    orderBy: { occurredAt: "asc" }
  });
  res.json({ success: true, data: events });
});

export default router;
