import { z } from "zod";
import { isObjectId } from "../utils/httpError.js";

const objectId = z.string().refine(isObjectId, "Identificador inválido.");
const rate = z.number().finite().min(0).max(1000);

export const restructuringPolicySchema = z.object({
  name: z.string().trim().min(3).max(100),
  maximumTermMonths: z.number().int().min(1).max(600),
  maximumGracePeriodDays: z.number().int().min(0).max(365),
  maximumUsuryRate: rate,
  maximumOfficerApprovalAmount: z.number().int().positive(),
  allowRateChange: z.boolean(),
  allowRepeatedRestructuring: z.boolean(),
  maximumRestructurings: z.number().int().min(1).max(20),
  overdueInstallmentsTreatment: z.enum(["CAPITALIZE", "REQUIRE_PAYMENT"]),
  includeAccruedInterest: z.boolean(),
  lateInterestTreatment: z.enum(["MANUAL_CAPITALIZE", "WAIVE", "NOT_APPLICABLE"]),
  effectiveFrom: z.string().datetime()
}).strict();

export const createRestructuringSchema = z.object({
  policyId: objectId,
  reason: z.string().trim().min(10).max(2000),
  termMonths: z.number().int().min(1).max(600),
  annualRate: rate.optional(),
  gracePeriodDays: z.number().int().min(0).max(365).default(0),
  firstDueDate: z.string().datetime(),
  lateInterestAmount: z.number().int().min(0).max(10_000_000_000).default(0),
  lateInterestEvidence: z.string().trim().min(10).max(1000).optional()
}).strict();

export const restructuringDecisionSchema = z.object({
  outcome: z.enum(["APPROVED", "REJECTED"]),
  justification: z.string().trim().min(10).max(2000)
}).strict();

export const restructuringAcceptanceSchema = z.object({
  accepted: z.literal(true),
  acceptanceMethod: z.enum(["SIGNED_DOCUMENT", "IN_PERSON", "DIGITAL"]),
  acceptanceEvidence: z.string().trim().min(10).max(2000)
}).strict();
