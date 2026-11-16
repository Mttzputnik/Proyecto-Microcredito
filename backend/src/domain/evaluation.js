// Evaluación de riesgo como APOYO a la decisión humana (ADR-004): calcula indicadores y compara contra
// una política configurable. NO aprueba ni rechaza. No hay ningún valor de política fijo en el código:
// solo se verifican los límites que la política tenga definidos (campos distintos de null).
//
// SUPUESTOS (ver docs/SUPUESTOS-PARA-REVISION.md):
//  E1. maxDebtRatio es una fracción (0.4 = 40 %) y se compara con
//      (pagos mensuales de deudas actuales + cuota estimada) / ingreso mensual.
//  E2. La cuota estimada usa finance.installmentAmount con la tasa de la política.
//  E3. Recomendaciones: SUPPORTS_REJECTION si falla algún límite; MANUAL_REVIEW si algún dato no permite
//      evaluar o la política no define ningún límite; SUPPORTS_APPROVAL si todos los límites definidos se cumplen.
//  E4. No se calcula un "nivel de riesgo" (no hay umbrales confirmados): solo indicadores y cumplimiento.

import { installmentAmount } from "./finance.js";

export const RECOMMENDATIONS = Object.freeze({
  SUPPORTS_APPROVAL: "SUPPORTS_APPROVAL",
  SUPPORTS_REJECTION: "SUPPORTS_REJECTION",
  MANUAL_REVIEW: "MANUAL_REVIEW"
});

export function ageInYears(birthDate, today = new Date()) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    today.getUTCMonth() < birth.getUTCMonth() ||
    (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

const isSet = (value) => value !== null && value !== undefined;
const round4 = (value) => Math.round(value * 10000) / 10000;

export function evaluate({ applicant, application, policy, today = new Date() }) {
  const checks = [];
  const addCheck = (code, label, status, detail) => checks.push({ code, label, status, detail });

  const income = applicant.monthlyIncome ?? null;
  const expenses = applicant.monthlyExpenses ?? 0;
  const debtPayments = applicant.monthlyDebtPayments ?? 0;
  const age = ageInYears(applicant.birthDate, today);

  let estimatedInstallment = null;
  if (isSet(policy.annualInterestRate)) {
    estimatedInstallment = installmentAmount(application.requestedAmount, policy.annualInterestRate, application.requestedTerm);
  }

  let debtToIncomeRatio = null;
  if (estimatedInstallment !== null && income > 0) {
    debtToIncomeRatio = round4((debtPayments + estimatedInstallment) / income);
  }

  let monthlyCapacity = null;
  if (income !== null && estimatedInstallment !== null) {
    monthlyCapacity = income - expenses - debtPayments - estimatedInstallment;
  }

  if (isSet(policy.minimumAge)) {
    if (age === null) addCheck("MINIMUM_AGE", "Edad mínima", "NOT_EVALUABLE", "No hay fecha de nacimiento.");
    else addCheck("MINIMUM_AGE", "Edad mínima", age >= policy.minimumAge ? "PASS" : "FAIL", `Edad ${age}; mínimo ${policy.minimumAge}.`);
  }
  if (isSet(policy.maximumAmount)) {
    const ok = application.requestedAmount <= policy.maximumAmount;
    addCheck("MAXIMUM_AMOUNT", "Monto máximo", ok ? "PASS" : "FAIL", `Solicitado ${application.requestedAmount}; máximo ${policy.maximumAmount}.`);
  }
  if (isSet(policy.maximumTermMonths)) {
    const ok = application.requestedTerm <= policy.maximumTermMonths;
    addCheck("MAXIMUM_TERM", "Plazo máximo", ok ? "PASS" : "FAIL", `Solicitado ${application.requestedTerm} meses; máximo ${policy.maximumTermMonths}.`);
  }
  if (isSet(policy.maxDebtRatio)) {
    if (debtToIncomeRatio === null) {
      addCheck("DEBT_RATIO", "Relación deuda/ingreso", "NOT_EVALUABLE",
        "Falta la tasa en la política o el ingreso mensual del solicitante.");
    } else {
      const ok = debtToIncomeRatio <= policy.maxDebtRatio;
      addCheck("DEBT_RATIO", "Relación deuda/ingreso", ok ? "PASS" : "FAIL",
        `Relación ${debtToIncomeRatio}; máximo ${policy.maxDebtRatio}.`);
    }
  }

  let recommendation;
  if (checks.some((c) => c.status === "FAIL")) recommendation = RECOMMENDATIONS.SUPPORTS_REJECTION;
  else if (checks.length === 0 || checks.some((c) => c.status === "NOT_EVALUABLE")) recommendation = RECOMMENDATIONS.MANUAL_REVIEW;
  else recommendation = RECOMMENDATIONS.SUPPORTS_APPROVAL;

  const notes = checks.filter((c) => c.status !== "PASS").map((c) => `${c.label}: ${c.detail}`);
  if (checks.length === 0) notes.push("La política no define ningún límite evaluable.");
  if (monthlyCapacity !== null && monthlyCapacity < 0) notes.push("La capacidad mensual estimada es negativa.");

  return {
    estimatedInstallment,
    debtToIncomeRatio,
    recommendation,
    observations: notes.length ? notes.join(" ") : null,
    indicators: {
      ageYears: age,
      requestedAmount: application.requestedAmount,
      requestedTerm: application.requestedTerm,
      monthlyIncome: income,
      monthlyExpenses: expenses,
      monthlyDebtPayments: debtPayments,
      estimatedInstallment,
      debtToIncomeRatio,
      monthlyCapacity,
      checks
    }
  };
}
