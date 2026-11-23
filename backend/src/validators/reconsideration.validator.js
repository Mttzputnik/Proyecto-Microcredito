import { z } from "zod";

export const submitReconsiderationSchema = z.object({
  applicationNumber: z.string().trim().min(8).max(40),
  accessToken: z.string().min(40).max(64).regex(/^[A-Za-z0-9_-]+$/),
  applicantMessage: z.string().trim().min(30).max(2000)
}).strict();

export const decideReconsiderationSchema = z.object({
  outcome: z.enum(["ACCEPTED", "UPHELD"]),
  justification: z.string().trim().min(10).max(2000)
}).strict();
