import test from "node:test";
import assert from "node:assert/strict";
import { ageInYears, evaluate, RECOMMENDATIONS } from "../src/domain/evaluation.js";

const today = new Date("2026-11-12T12:00:00Z");
const applicant = { birthDate: "1990-05-20T00:00:00.000Z", monthlyIncome: 2_000_000, monthlyExpenses: 800_000, monthlyDebtPayments: 100_000 };
const application = { requestedAmount: 1_000_000, requestedTerm: 12 };
const fullPolicy = { minimumAge: 18, maximumAmount: 5_000_000, maximumTermMonths: 24, maxDebtRatio: 0.4, annualInterestRate: 24 };

test("ageInYears respeta si ya pasó el cumpleaños", () => {
  assert.equal(ageInYears("1990-11-12T00:00:00Z", today), 36);
  assert.equal(ageInYears("1990-11-13T00:00:00Z", today), 35);
  assert.equal(ageInYears(null, today), null);
});

test("si cumple todos los límites definidos, apoya la aprobación y reporta indicadores", () => {
  const result = evaluate({ applicant, application, policy: fullPolicy, today });
  assert.equal(result.recommendation, RECOMMENDATIONS.SUPPORTS_APPROVAL);
  assert.ok(result.estimatedInstallment > 0);
  assert.ok(result.debtToIncomeRatio > 0 && result.debtToIncomeRatio <= 0.4);
  assert.equal(result.indicators.checks.length, 4);
  assert.ok(result.indicators.checks.every((c) => c.status === "PASS"));
  assert.equal(result.observations, null);
});

test("si falla un límite, apoya el rechazo y lo explica", () => {
  const result = evaluate({ applicant, application: { requestedAmount: 9_000_000, requestedTerm: 12 }, policy: fullPolicy, today });
  assert.equal(result.recommendation, RECOMMENDATIONS.SUPPORTS_REJECTION);
  assert.match(result.observations, /Monto máximo/);
});

test("una relación deuda/ingreso por encima del máximo apoya el rechazo", () => {
  const result = evaluate({ applicant: { ...applicant, monthlyIncome: 400_000 }, application, policy: fullPolicy, today });
  const check = result.indicators.checks.find((c) => c.code === "DEBT_RATIO");
  assert.equal(check.status, "FAIL");
  assert.equal(result.recommendation, RECOMMENDATIONS.SUPPORTS_REJECTION);
});

test("un menor de edad falla la edad mínima", () => {
  const result = evaluate({ applicant: { ...applicant, birthDate: "2015-01-01T00:00:00Z" }, application, policy: fullPolicy, today });
  assert.equal(result.indicators.checks.find((c) => c.code === "MINIMUM_AGE").status, "FAIL");
});

test("sin tasa en la política no se puede evaluar la deuda: revisión manual, no aprobación", () => {
  const result = evaluate({ applicant, application, policy: { ...fullPolicy, annualInterestRate: null }, today });
  assert.equal(result.estimatedInstallment, null);
  assert.equal(result.indicators.checks.find((c) => c.code === "DEBT_RATIO").status, "NOT_EVALUABLE");
  assert.equal(result.recommendation, RECOMMENDATIONS.MANUAL_REVIEW);
});

test("sin fecha de nacimiento no se puede evaluar la edad: revisión manual", () => {
  const result = evaluate({ applicant: { ...applicant, birthDate: null }, application, policy: fullPolicy, today });
  assert.equal(result.recommendation, RECOMMENDATIONS.MANUAL_REVIEW);
});

test("una política sin ningún límite no puede aprobar por sí sola", () => {
  const empty = { minimumAge: null, maximumAmount: null, maximumTermMonths: null, maxDebtRatio: null, annualInterestRate: null };
  const result = evaluate({ applicant, application, policy: empty, today });
  assert.equal(result.recommendation, RECOMMENDATIONS.MANUAL_REVIEW);
  assert.match(result.observations, /no define ningún límite/);
});

test("un fallo gana sobre un dato no evaluable", () => {
  const result = evaluate({ applicant: { ...applicant, birthDate: null }, application: { requestedAmount: 9_000_000, requestedTerm: 12 }, policy: fullPolicy, today });
  assert.equal(result.recommendation, RECOMMENDATIONS.SUPPORTS_REJECTION);
});

test("avisa cuando la capacidad mensual es negativa", () => {
  const result = evaluate({ applicant: { ...applicant, monthlyExpenses: 1_990_000 }, application, policy: fullPolicy, today });
  assert.ok(result.indicators.monthlyCapacity < 0);
  assert.match(result.observations, /capacidad mensual estimada es negativa/);
});
