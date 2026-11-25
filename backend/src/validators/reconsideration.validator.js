import { z } from "zod";

export const submitReconsiderationSchema = z.object({
  applicationNumber: z.string().trim().min(8).max(40),
  accessToken: z.string().min(40).max(64).regex(/^[A-Za-z0-9_-]+$/),
  applicantMessage: z.string().trim().min(30).max(2000),
  documents: z.array(z.object({
    name: z.string().trim().min(1).max(180),
    mimeType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
    contentBase64: z.string().min(1).max(5_600_000)
  }).strict()).max(3).optional().default([])
}).strict();

export const decideReconsiderationSchema = z.object({
  outcome: z.enum(["ACCEPTED", "UPHELD"]),
  justification: z.string().trim().min(10).max(2000)
}).strict();
