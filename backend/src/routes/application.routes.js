import { Router } from "express";
import { randomUUID } from "node:crypto";
import { createTrackingCredential, matchesTrackingToken } from "../services/applicationTracking.service.js";
import { trackingLookupSchema } from "../validators/application.validator.js";
import { writeAudit } from "../services/audit.service.js";
import { prisma } from "../config/prisma.js";
import { applicationSchema } from "../validators/application.validator.js";
import { assignPendingApplications } from "../services/applicationAssignment.service.js";

const router = Router();

// POST /api/applications/track — consulta pública protegida por número de caso + token secreto.
// La respuesta contiene únicamente datos mínimos de seguimiento.
router.post("/track", async (req, res, next) => {
  const parsed = trackingLookupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: "Los datos de consulta no son válidos." });
  }

  try {
    const { applicationNumber, accessToken } = parsed.data;
    const application = await prisma.loanApplication.findUnique({
      where: { applicationNumber },
      select: {
        id: true,
        applicationNumber: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        trackingCredential: { select: { tokenHash: true, revokedAt: true } }
      }
    });

    // Misma respuesta para caso inexistente, token incorrecto o credencial revocada.
    if (!application?.trackingCredential ||
        application.trackingCredential.revokedAt ||
        !matchesTrackingToken(accessToken, application.trackingCredential.tokenHash)) {
      return res.status(404).json({ success: false, message: "No fue posible validar los datos de consulta." });
    }

    await prisma.applicationTrackingCredential.update({
      where: { applicationId: application.id },
      data: { lastUsedAt: new Date() }
    });

    return res.json({
      success: true,
      data: {
        applicationNumber: application.applicationNumber,
        status: application.status,
        createdAt: application.createdAt,
        updatedAt: application.updatedAt
      }
    });
  } catch (error) {
    return next(error);
  }
});


router.post("/", async (req, res, next) => {
  const parsed = applicationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Los datos de la solicitud no son válidos.",
      details: parsed.error.issues.map(({ path, message }) => ({ field: path.join("."), message }))
    });
  }

  const { applicant: data, requestedAmount, requestedTerm, purpose } = parsed.data;
  const birthDate = new Date(data.birthDate);
  if (birthDate >= new Date()) {
    return res.status(400).json({ success: false, message: "La fecha de nacimiento debe estar en el pasado." });
  }

  try {
    const trackingCredential = createTrackingCredential();
    const application = await prisma.$transaction(async (tx) => {
      const existingApplicant = await tx.applicant.findUnique({
        where: { documentNumber: data.documentNumber }
      });
      const applicantData = {
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        birthDate,
        phone: data.phone,
        municipality: data.municipality,
        residenceZone: data.residenceZone,
        occupation: data.occupation,
        activityDuration: data.activityDuration,
        monthlyIncome: data.monthlyIncome,
        monthlyExpenses: data.monthlyExpenses,
        dependents: data.dependents,
        hasExistingDebts: data.hasExistingDebts,
        monthlyDebtPayments: data.monthlyDebtPayments
      };

      const applicant = existingApplicant
        ? await tx.applicant.update({ where: { id: existingApplicant.id }, data: applicantData })
        : await tx.applicant.create({ data: applicantData });

      const applicationNumber = `MC-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
      const created = await tx.loanApplication.create({
        data: { applicationNumber, applicantId: applicant.id, requestedAmount, requestedTerm, purpose, status: "PENDING_ASSIGNMENT" },
        select: {
          id: true,
          applicationNumber: true,
          requestedAmount: true,
          requestedTerm: true,
          purpose: true,
          status: true,
          createdAt: true
        }
      });

      await tx.applicationTrackingCredential.create({
        data: { applicationId: created.id, tokenHash: trackingCredential.tokenHash }
      });
      await writeAudit(tx, {
        actorId: null,
        action: "APPLICATION_TRACKING_CREDENTIAL_ISSUED",
        entityType: "LoanApplication",
        entityId: created.id,
        description: "Se emitió una credencial privada para consultar el estado de la solicitud."
      });

      // Se intenta asignar toda la cola pendiente, no solo el caso recién creado.
      // Si no hay oficiales activos, la solicitud conserva PENDING_ASSIGNMENT.
      await assignPendingApplications(tx);
      const current = await tx.loanApplication.findUnique({
        where: { id: created.id },
        select: { id: true, status: true, assignedOfficerId: true, assignedAt: true }
      });
      return { ...created, ...current, trackingToken: trackingCredential.token };
    });

    return res.status(201).json({
      success: true,
      message: application.status === "PENDING_ASSIGNMENT"
        ? "La solicitud fue recibida y quedó pendiente de asignación. Guarda el código privado de consulta; solo se muestra una vez."
        : "La solicitud fue recibida y asignada a un oficial de crédito. Guarda el código privado de consulta; solo se muestra una vez.",
      data: {
        applicationNumber: application.applicationNumber,
        status: application.status,
        createdAt: application.createdAt,
        trackingToken: application.trackingToken
      }
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ success: false, message: "Ya existe un registro con ese documento. Intenta nuevamente." });
    }
    return next(error);
  }
});

export default router;
