import test from "node:test";
import assert from "node:assert/strict";
import { restructuringPolicySchema, createRestructuringSchema } from "../src/validators/restructuring.validator.js";
import { listRestructuringPolicies } from "../src/services/restructuring.service.js";

const policy = {
  name: "Política de normalización",
  maximumTermMonths: 24,
  maximumGracePeriodDays: 30,
  maximumUsuryRate: 30,
  maximumOfficerApprovalAmount: 5000000,
  allowRateChange: false,
  allowRepeatedRestructuring: false,
  maximumRestructurings: 1,
  overdueInstallmentsTreatment: "REQUIRE_PAYMENT",
  includeAccruedInterest: false,
  lateInterestTreatment: "NOT_APPLICABLE",
  approvalReference: "ACTA-COOP-2026-02",
  approvalDate: "2026-10-20T00:00:00.000Z",
  effectiveFrom: "2026-11-01T00:00:00.000Z"
};

test("política de reestructuración exige referencia de aprobación institucional", () => {
  assert.equal(restructuringPolicySchema.safeParse(policy).success, true);
  const { approvalReference, ...missing } = policy;
  assert.equal(restructuringPolicySchema.safeParse(missing).success, false);
});

test("solicitudes solo admiten cronogramas mensuales", () => {
  const base = {
    policyId: "507f1f77bcf86cd799439011",
    reason: "El asociado presenta dificultades temporales de liquidez.",
    termMonths: 12,
    gracePeriodDays: 0,
    firstDueDate: "2026-12-15T00:00:00.000Z",
    lateInterestAmount: 0
  };
  assert.equal(createRestructuringSchema.safeParse(base).success, true);
  assert.equal(createRestructuringSchema.safeParse({ ...base, scheduleFrequency: "WEEKLY" }).success, false);
});


test("lista políticas autorizadas aun cuando MongoDB no almacena effectiveUntil", async () => {
  const now = new Date("2026-11-25T12:00:00.000Z");
  const policyRow = {
    id: "policy-1", active: true, effectiveFrom: new Date("2026-11-01T00:00:00.000Z"),
    approvalReference: "ACTA-COOP-2026-02", approvalDate: new Date("2026-10-20T00:00:00.000Z")
  };
  let query;
  const rows = await listRestructuringPolicies({ restructuringPolicy: { findMany: async (args) => { query = args; return [policyRow]; } } }, now);
  assert.equal(rows.length, 1);
  assert.equal("OR" in query.where, false);
});
