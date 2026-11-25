import test from "node:test";
import assert from "node:assert/strict";
import { policySchema } from "../src/validators/finance.validator.js";
import { isCreditPolicyReady } from "../src/services/policy.service.js";

const completePolicy = {
  name: "Política institucional",
  minimumAge: 18,
  maximumAmount: 5000000,
  maximumTermMonths: 24,
  maxDebtRatio: 0.4,
  annualInterestRate: 24,
  maximumSimultaneousLoans: 2,
  allowedPurposes: ["negocio", "estudio"],
  requireVerifiedResidence: true,
  approvalReference: "ACTA-COOP-2026-01",
  approvalDate: "2026-11-01T00:00:00.000Z"
};

test("una política nueva exige todos los límites y la referencia de aprobación", () => {
  assert.equal(policySchema.safeParse(completePolicy).success, true);
  const { approvalReference, ...withoutReference } = completePolicy;
  assert.equal(policySchema.safeParse(withoutReference).success, false);
  const { maximumAmount, ...withoutLimit } = completePolicy;
  assert.equal(policySchema.safeParse(withoutLimit).success, false);
});

test("una política antigua incompleta no puede considerarse lista para evaluación", () => {
  assert.equal(isCreditPolicyReady({ ...completePolicy, approvalDate: new Date(completePolicy.approvalDate) }), true);
  assert.equal(isCreditPolicyReady({ ...completePolicy, approvalReference: null }), false);
  assert.equal(isCreditPolicyReady({ ...completePolicy, maxDebtRatio: null }), false);
});
