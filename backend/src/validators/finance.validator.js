import { z } from "zod";
import { isObjectId } from "../utils/httpError.js";

const objectId = z.string().refine(isObjectId, "Identificador inválido.");

// Los límites son opcionales: lo que no se define, no se evalúa. No hay valores por defecto en el código.
export const policySchema = z.object({
  name: z.string().trim().min(3).max(100),
  description: z.string().trim().max(500).optional(),
  minimumAge: z.number().int().min(0).max(120).optional(),
  maximumAmount: z.number().int().positive().optional(),
  maximumTermMonths: z.number().int().min(1).max(600).optional(),
  maxDebtRatio: z.number().gt(0).max(1, "Es una fracción: 0.4 significa 40 %.").optional(),
  annualInterestRate: z.number().min(0).max(100, "Es un porcentaje anual: 24 significa 24 %.").optional(),
  effectiveFrom: z.string().datetime().optional()
}).strict();

export const evaluationSchema = z.object({ policyId: objectId.optional() }).strict();

export const formalizeSchema = z.object({ applicationId: objectId }).strict();

export const disburseSchema = z.object({ disbursementDate: z.string().datetime().optional() }).strict();

export const paymentSchema = z.object({
  amount: z.number().int("El pago debe ser en pesos enteros.").positive().max(10_000_000_000),
  paymentDate: z.string().datetime().optional(),
  reference: z.string().trim().min(1).max(100).optional(),
  notes: z.string().trim().min(1).max(500).optional()
}).strict();

export const writeOffSchema = z.object({
  justification: z.string().trim().min(10, "La justificación debe tener al menos 10 caracteres.").max(2000)
}).strict();

export const listLoansQuery = z.object({
  status: z.enum(["PENDING_DISBURSEMENT", "ACTIVE", "PAID", "WRITTEN_OFF"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});
