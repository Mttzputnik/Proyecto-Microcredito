import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { PERMISSIONS } from "../domain/roles.js";
import { listApplicantsQuery, updateApplicantSchema } from "../validators/management.validator.js";
import { parseOrThrow, requireObjectId, httpError } from "../utils/httpError.js";
import { writeAudit } from "../services/audit.service.js";

// Todo exige sesión: son datos personales. Los solicitantes nuevos se crean por POST /api/applications.
const router = Router();
router.use(authenticate);

// GET /api/applicants?search=1234&page=1&limit=20  (busca por documento o nombre)
router.get("/", authorize(...PERMISSIONS.readApplicants), async (req, res) => {
  const { search, page, limit } = parseOrThrow(listApplicantsQuery, req.query, "Los filtros no son válidos.");
  const where = {
    applications: { some: { assignedOfficerId: req.user.id } },
    ...(search ? {
      OR: [
        { documentNumber: { contains: search } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } }
      ]
    } : {})
  };

  const [total, items] = await Promise.all([
    prisma.applicant.count({ where }),
    prisma.applicant.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit
    })
  ]);
  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

// GET /api/applicants/:id  (con sus solicitudes)
router.get("/:id", authorize(...PERMISSIONS.readApplicants), async (req, res) => {
  const id = requireObjectId(req.params.id);
  const applicant = await prisma.applicant.findFirst({
    where: { id, applications: { some: { assignedOfficerId: req.user.id } } },
    include: {
      applications: {
        where: { assignedOfficerId: req.user.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, applicationNumber: true, requestedAmount: true, requestedTerm: true, status: true, createdAt: true }
      }
    }
  });
  if (!applicant) throw httpError(404, "Solicitante no encontrado.");
  res.json({ success: true, data: applicant });
});

// PATCH /api/applicants/:id  (solo datos de contacto y perfil; deja rastro en auditoría)
router.patch("/:id", authorize(...PERMISSIONS.editApplicants), async (req, res) => {
  const id = requireObjectId(req.params.id);
  const changes = parseOrThrow(updateApplicantSchema, req.body);

  const updated = await prisma.$transaction(async (tx) => {
    const before = await tx.applicant.findUnique({ where: { id } });
    if (!before) throw httpError(404, "Solicitante no encontrado.");

    const after = await tx.applicant.update({ where: { id }, data: changes });
    const changedFields = Object.keys(changes).filter((key) => before[key] !== after[key]);
    await writeAudit(tx, {
      actorId: req.user.id,
      action: "APPLICANT_UPDATED",
      entityType: "Applicant",
      entityId: id,
      description: `Solicitante actualizado (${changedFields.join(", ") || "sin cambios"})`,
      // El historial registra qué atributos cambiaron, nunca sus valores personales o financieros.
      metadata: { changedFields, changeCount: changedFields.length }
    });
    return after;
  });

  res.json({ success: true, message: "Solicitante actualizado.", data: updated });
});

export default router;
