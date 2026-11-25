import { z } from "zod";

export const reportQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
}).strict().superRefine((value, ctx) => {
  if (value.from && value.to && new Date(value.from) > new Date(value.to)) {
    ctx.addIssue({ code: "custom", path: ["from"], message: "La fecha inicial no puede ser posterior a la fecha final." });
  }
});
