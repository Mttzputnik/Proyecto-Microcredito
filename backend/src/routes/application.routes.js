import { Router } from "express";
import { randomUUID } from "node:crypto";
import { prisma } from "../config/prisma.js";
import { applicationSchema } from "../validators/application.validator.js";

const router = Router();



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
      return tx.loanApplication.create({
        data: { applicationNumber, applicantId: applicant.id, requestedAmount, requestedTerm, purpose, status: "SUBMITTED" },
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
    });

    return res.status(201).json({
      success: true,
      message: "La solicitud fue recibida correctamente.",
      data: application
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ success: false, message: "Ya existe un registro con ese documento. Intenta nuevamente." });
    }
    return next(error);
  }
});

export default router;