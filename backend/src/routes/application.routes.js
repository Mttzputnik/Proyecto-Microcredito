import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { prisma } from "../config/prisma.js";

const router = Router();

const applicationSchema = z.object({
  applicant: z.object({
    documentType: z.enum(["CC", "CE"]),
    documentNumber: z.string().trim().min(5).max(20).regex(/^\d+$/, "El documento debe contener solo números."),
    firstName: z.string().trim().min(2).max(80),
    lastName: z.string().trim().min(2).max(100),
    birthDate: z.string().datetime(),
    phone: z.string().trim().min(7).max(20),
    municipality: z.string().trim().min(2).max(100),
    residenceZone: z.enum(["urbana", "rural"]),
    occupation: z.string().trim().min(2).max(120),
    activityDuration: z.enum(["menos-6", "6-12", "1-3", "mas-3"]),
    monthlyIncome: z.number().finite().nonnegative(),
    monthlyExpenses: z.number().finite().nonnegative(),
    dependents: z.number().int().min(0).max(30),
    hasExistingDebts: z.boolean(),
    monthlyDebtPayments: z.number().finite().nonnegative()
  }),
  requestedAmount: z.number().int().positive().max(1000000000),
  requestedTerm: z.number().int().min(1).max(120),
  purpose: z.enum(["negocio", "herramientas", "estudio", "hogar", "otro"])
}).strict();

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

  let applicantId;
  let applicantWasCreated = false;

  try {
    const existingApplicant = await prisma.applicant.findUnique({
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
      ? await prisma.applicant.update({ where: { id: existingApplicant.id }, data: applicantData })
      : await prisma.applicant.create({ data: applicantData });

    applicantId = applicant.id;
    applicantWasCreated = !existingApplicant;

    const applicationNumber = `MC-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const application = await prisma.loanApplication.create({
      data: { applicationNumber, applicantId, requestedAmount, requestedTerm, purpose, status: "SUBMITTED" },
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

    return res.status(201).json({
      success: true,
      message: "La solicitud fue recibida correctamente.",
      data: application
    });
  } catch (error) {
    if (applicantWasCreated && applicantId) {
      try {
        await prisma.applicant.delete({ where: { id: applicantId } });
      } catch (cleanupError) {
        console.error("No fue posible limpiar el solicitante creado:", cleanupError);
      }
    }
    if (error.code === "P2002") {
      return res.status(409).json({ success: false, message: "Ya existe un registro con ese documento. Intenta nuevamente." });
    }
    return next(error);
  }
});

export default router;