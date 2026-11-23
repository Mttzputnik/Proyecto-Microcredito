import test from "node:test";
import assert from "node:assert/strict";
import { evaluate, RECOMMENDATIONS } from "./evaluation.js";
const today = new Date("2026-11-23T12:00:00.000Z");
const applicant = { birthDate: new Date("1990-01-01T00:00:00.000Z"), monthlyIncome: 3000000, monthlyExpenses: 1200000, monthlyDebtPayments: 200000 };
const application = { requestedAmount: 2000000, requestedTerm: 12, purpose: "negocio" };
const policy = { minimumAge: 18, maximumAmount: 5000000, maximumTermMonths: 24, maxDebtRatio: 0.5, annualInterestRate: 0, maximumSimultaneousLoans: 2, allowedPurposes: ["negocio", "herramientas"], requireVerifiedResidence: true };
const internalHistory = { activeLoans: 1, historicalApplications: 2, hasActiveDelinquency: false };
const residenceVerification = { verified: true, notes: "Visita y soporte de residencia contrastados." };

test("PO-03: recomienda aprobación solo si todos los criterios configurados cumplen", () => {
  const result = evaluate({ applicant, application, policy, internalHistory, residenceVerification, today });
  assert.equal(result.recommendation, RECOMMENDATIONS.SUPPORTS_APPROVAL);
  assert.ok(result.indicators.checks.every((check) => check.status === "PASS"));
});
test("PO-03: residencia sin verificar queda no evaluable", () => {
  const result = evaluate({ applicant, application, policy, internalHistory, today });
  assert.equal(result.indicators.checks.find((item) => item.code === "VERIFIED_RESIDENCE").status, "NOT_EVALUABLE");
  assert.equal(result.recommendation, RECOMMENDATIONS.MANUAL_REVIEW);
});
test("PO-03: mora interna activa genera incumplimiento", () => {
  const result = evaluate({ applicant, application, policy, internalHistory: { ...internalHistory, hasActiveDelinquency: true }, residenceVerification, today });
  assert.equal(result.indicators.checks.find((item) => item.code === "INTERNAL_DELINQUENCY").status, "FAIL");
  assert.equal(result.recommendation, RECOMMENDATIONS.SUPPORTS_REJECTION);
});
test("PO-03: propósito no permitido se marca como incumplimiento", () => {
  const result = evaluate({ applicant, application, policy: { ...policy, allowedPurposes: ["estudio"] }, internalHistory, residenceVerification, today });
  assert.equal(result.indicators.checks.find((item) => item.code === "ALLOWED_PURPOSE").status, "FAIL");
});
test("PO-03: el máximo de préstamos simultáneos se aplica antes del nuevo préstamo", () => {
  const result = evaluate({ applicant, application, policy: { ...policy, maximumSimultaneousLoans: 1 }, internalHistory, residenceVerification, today });
  assert.equal(result.indicators.checks.find((item) => item.code === "SIMULTANEOUS_LOANS").status, "FAIL");
});
test("PO-03: política sin propósito o máximo de préstamos requiere revisión manual", () => {
  const result = evaluate({ applicant, application, policy: { minimumAge: 18, annualInterestRate: 0 }, internalHistory, residenceVerification, today });
  assert.equal(result.recommendation, RECOMMENDATIONS.MANUAL_REVIEW);
  assert.ok(result.indicators.checks.some((item) => item.status === "NOT_EVALUABLE"));
});
