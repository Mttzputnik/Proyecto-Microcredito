import { z } from "zod";

export const applicationSchema = z.object({
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
