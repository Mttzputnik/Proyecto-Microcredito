import { installmentAmount } from "./finance.js";
export const RECOMMENDATIONS = Object.freeze({
  SUPPORTS_APPROVAL: "SUPPORTS_APPROVAL", SUPPORTS_REJECTION: "SUPPORTS_REJECTION", MANUAL_REVIEW: "MANUAL_REVIEW"
});
export function ageInYears(birthDate, today = new Date()) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday = today.getUTCMonth() < birth.getUTCMonth() ||
    (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}
const isSet = (value) => value !== null && value !== undefined;
const round4 = (value) => Math.round(value * 10000) / 10000;

export function evaluate({ applicant, application, policy, internalHistory = {}, residenceVerification = null, today = new Date() }) {
  const checks = [];
  const addCheck = (code, label, status, detail) => checks.push({ code, label, status, detail });
  const income = applicant.monthlyIncome ?? null;
  const expenses = applicant.monthlyExpenses ?? 0;
  const debtPayments = applicant.monthlyDebtPayments ?? 0;
  const age = ageInYears(applicant.birthDate, today);
  let estimatedInstallment = null;
  if (isSet(policy.annualInterestRate)) estimatedInstallment = installmentAmount(application.requestedAmount, policy.annualInterestRate, application.requestedTerm);
  let debtToIncomeRatio = null;
  if (estimatedInstallment !== null && income > 0) debtToIncomeRatio = round4((debtPayments + estimatedInstallment) / income);
  const monthlyCapacity = income !== null && estimatedInstallment !== null
    ? income - expenses - debtPayments - estimatedInstallment : null;

  if (isSet(policy.minimumAge)) {
    if (age === null) addCheck("MINIMUM_AGE", "Edad mínima", "NOT_EVALUABLE", "No hay fecha de nacimiento verificable.");
    else addCheck("MINIMUM_AGE", "Edad mínima", age >= policy.minimumAge ? "PASS" : "FAIL", `Edad ${age}; mínimo ${policy.minimumAge}.`);
  } else addCheck("MINIMUM_AGE", "Edad mínima", "NOT_EVALUABLE", "La política no define la edad mínima.");

  if (isSet(policy.maximumAmount)) addCheck("MAXIMUM_AMOUNT", "Monto máximo",
    application.requestedAmount <= policy.maximumAmount ? "PASS" : "FAIL",
    `Solicitado ${application.requestedAmount}; máximo ${policy.maximumAmount}.`);
  else addCheck("MAXIMUM_AMOUNT", "Monto máximo", "NOT_EVALUABLE", "La política no define el monto máximo.");

  if (isSet(policy.maximumTermMonths)) addCheck("MAXIMUM_TERM", "Plazo máximo",
    application.requestedTerm <= policy.maximumTermMonths ? "PASS" : "FAIL",
    `Solicitado ${application.requestedTerm} meses; máximo ${policy.maximumTermMonths}.`);
  else addCheck("MAXIMUM_TERM", "Plazo máximo", "NOT_EVALUABLE", "La política no define el plazo máximo.");

  if (isSet(policy.maxDebtRatio)) {
    if (debtToIncomeRatio === null) addCheck("DEBT_RATIO", "Relación deuda/ingreso", "NOT_EVALUABLE", "Falta la tasa de la política o el ingreso mensual.");
    else addCheck("DEBT_RATIO", "Relación deuda/ingreso", debtToIncomeRatio <= policy.maxDebtRatio ? "PASS" : "FAIL",
      `Relación ${debtToIncomeRatio}; máximo ${policy.maxDebtRatio}.`);
  } else addCheck("DEBT_RATIO", "Relación deuda/ingreso", "NOT_EVALUABLE", "La política no define el máximo de endeudamiento.");

  if (policy.requireVerifiedResidence !== false) {
    if (!residenceVerification) addCheck("VERIFIED_RESIDENCE", "Residencia verificable", "NOT_EVALUABLE", "El oficial aún no registra la verificación de residencia.");
    else addCheck("VERIFIED_RESIDENCE", "Residencia verificable", residenceVerification.verified ? "PASS" : "FAIL", residenceVerification.notes);
  }
  if (Array.isArray(policy.allowedPurposes) && policy.allowedPurposes.length) {
    const allowed = policy.allowedPurposes.includes(application.purpose);
    addCheck("ALLOWED_PURPOSE", "Propósito permitido", allowed ? "PASS" : "FAIL",
      allowed ? `El propósito ${application.purpose} está permitido.` : `El propósito ${application.purpose} no está permitido por esta política.`);
  } else addCheck("ALLOWED_PURPOSE", "Propósito permitido", "NOT_EVALUABLE", "La política no define propósitos permitidos.");

  if (isSet(policy.maximumSimultaneousLoans)) {
    if (!Number.isInteger(internalHistory.activeLoans)) addCheck("SIMULTANEOUS_LOANS", "Endeudamiento simultáneo", "NOT_EVALUABLE", "No fue posible consultar los préstamos internos vigentes.");
    else addCheck("SIMULTANEOUS_LOANS", "Endeudamiento simultáneo",
      internalHistory.activeLoans < policy.maximumSimultaneousLoans ? "PASS" : "FAIL",
      `Préstamos vigentes: ${internalHistory.activeLoans}; máximo permitido: ${policy.maximumSimultaneousLoans}.`);
  } else addCheck("SIMULTANEOUS_LOANS", "Endeudamiento simultáneo", "NOT_EVALUABLE", "La política no define el máximo de préstamos simultáneos.");

  if (Number.isInteger(internalHistory.historicalApplications)) addCheck("INTERNAL_CREDIT_HISTORY", "Historial crediticio interno", "PASS",
    `Solicitudes anteriores: ${internalHistory.historicalApplications}; aprobadas: ${internalHistory.previousApprovedApplications ?? 0}; rechazadas: ${internalHistory.previousRejectedApplications ?? 0}; préstamos históricos: ${internalHistory.historicalLoans ?? 0}.`);
  else addCheck("INTERNAL_CREDIT_HISTORY", "Historial crediticio interno", "NOT_EVALUABLE", "No fue posible consultar el historial interno.");

  if (typeof internalHistory.hasActiveDelinquency === "boolean") addCheck("INTERNAL_DELINQUENCY", "Mora interna activa",
    internalHistory.hasActiveDelinquency ? "FAIL" : "PASS",
    internalHistory.hasActiveDelinquency ? "Se encontraron cuotas vencidas con saldo pendiente en préstamos internos."
      : "No se encontraron cuotas vencidas con saldo pendiente en préstamos internos.");
  else addCheck("INTERNAL_DELINQUENCY", "Mora interna activa", "NOT_EVALUABLE", "No fue posible consultar el historial de obligaciones internas.");

  const recommendation = checks.some((c) => c.status === "FAIL") ? RECOMMENDATIONS.SUPPORTS_REJECTION
    : checks.length === 0 || checks.some((c) => c.status === "NOT_EVALUABLE") ? RECOMMENDATIONS.MANUAL_REVIEW
    : RECOMMENDATIONS.SUPPORTS_APPROVAL;
  const notes = checks.filter((c) => c.status !== "PASS").map((c) => `${c.label}: ${c.detail}`);
  return {
    estimatedInstallment, debtToIncomeRatio, recommendation, observations: notes.length ? notes.join(" ") : null,
    indicators: {
      ageYears: age, requestedAmount: application.requestedAmount, requestedTerm: application.requestedTerm,
      monthlyIncome: income, monthlyExpenses: expenses, monthlyDebtPayments: debtPayments,
      estimatedInstallment, debtToIncomeRatio, monthlyCapacity,
      internalHistory: { activeLoans: internalHistory.activeLoans ?? null,
        historicalApplications: internalHistory.historicalApplications ?? null,
        previousApprovedApplications: internalHistory.previousApprovedApplications ?? null,
        previousRejectedApplications: internalHistory.previousRejectedApplications ?? null,
        historicalLoans: internalHistory.historicalLoans ?? null,
        hasActiveDelinquency: internalHistory.hasActiveDelinquency ?? null },
      residenceVerification: residenceVerification ? { verified: residenceVerification.verified,
        notes: residenceVerification.notes, verifiedAt: residenceVerification.verifiedAt } : null,
      checks
    }
  };
}
