import { z } from "zod";
import { applicationTransitions } from "../domain/states.js";

const STATUSES = Object.keys(applicationTransitions);

export const listApplicationsQuery = z.object({
  status: z.enum(STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

export const listApplicantsQuery = z.object({
  search: z.string().trim().min(1).max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

export const changeStatusSchema = z.object({
  status: z.enum(STATUSES),
  justification: z.string().trim().min(10, "La justificación debe tener al menos 10 caracteres.").max(2000).optional(),
  note: z.string().trim().min(1).max(1000).optional()
}).strict();

// Solo se pueden editar datos de contacto y perfil; la identidad (documento, nombre) no.
export const updateApplicantSchema = z.object({
  email: z.string().trim().toLowerCase().email().optional(),
  phone: z.string().trim().min(7).max(20).optional(),
  address: z.string().trim().min(3).max(200).optional(),
  municipality: z.string().trim().min(2).max(100).optional(),
  residenceZone: z.enum(["urbana", "rural"]).optional(),
  occupation: z.string().trim().min(2).max(120).optional(),
  activityDuration: z.enum(["menos-6", "6-12", "1-3", "mas-3"]).optional(),
  monthlyIncome: z.number().finite().nonnegative().optional(),
  monthlyExpenses: z.number().finite().nonnegative().optional(),
  dependents: z.number().int().min(0).max(30).optional(),
  hasExistingDebts: z.boolean().optional(),
  monthlyDebtPayments: z.number().finite().nonnegative().optional()
}).strict().refine((obj) => Object.keys(obj).length > 0, { message: "Envía al menos un campo para actualizar." });
