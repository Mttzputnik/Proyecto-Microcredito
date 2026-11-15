// Cálculos financieros del microcrédito. Funciones puras, sin base de datos.
//
// SUPUESTOS (ver docs/SUPUESTOS-PARA-REVISION.md; el Product Owner debe confirmarlos, ADR-005):
//  S1. La tasa se guarda como PORCENTAJE anual (24 significa 24 %).
//  S2. Convención de la tasa: efectiva anual (E.A.). Tasa mensual = (1 + E.A.)^(1/12) - 1.
//      Cambiar RATE_CONVENTION a "NOMINAL_ANNUAL" usa tasa mensual = tasa anual / 12.
//  S3. Cuota fija mensual (sistema francés), pagada al final de cada mes.
//  S4. Todo en pesos enteros: se redondea al peso más cercano en cada cuota; la última cuota
//      absorbe la diferencia para que el capital sume exactamente el monto prestado.
//  S5. Primera cuota un mes después del desembolso; cuotas mensuales (si el mes es más corto, el último día).

export const RATE_CONVENTION = "EFFECTIVE_ANNUAL";

export const roundCOP = (value) => Math.round(value);

export function monthlyRate(annualRatePercent, convention = RATE_CONVENTION) {
  if (!Number.isFinite(annualRatePercent) || annualRatePercent < 0) {
    throw new RangeError("La tasa anual debe ser un número mayor o igual a 0.");
  }
  const annual = annualRatePercent / 100;
  if (convention === "NOMINAL_ANNUAL") return annual / 12;
  return Math.pow(1 + annual, 1 / 12) - 1;
}

function assertLoanInputs(principal, termMonths) {
  if (!Number.isInteger(principal) || principal <= 0) throw new RangeError("El monto debe ser un entero positivo en pesos.");
  if (!Number.isInteger(termMonths) || termMonths < 1) throw new RangeError("El plazo debe ser un entero de al menos 1 mes.");
}

export function installmentAmount(principal, annualRatePercent, termMonths, convention = RATE_CONVENTION) {
  assertLoanInputs(principal, termMonths);
  const r = monthlyRate(annualRatePercent, convention);
  if (r === 0) return roundCOP(principal / termMonths);
  return roundCOP((principal * r) / (1 - Math.pow(1 + r, -termMonths)));
}

// Suma meses en UTC; si el día no existe en el mes destino, usa el último día del mes.
export function addMonths(date, months) {
  const result = new Date(date.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

// Devuelve las filas del cronograma: { installment, dueDate, principal, interest, totalDue, balance }.
// `balance` es el saldo de capital que queda después de pagar esa cuota.
export function buildSchedule({ principal, annualRatePercent, termMonths, disbursementDate, convention = RATE_CONVENTION }) {
  assertLoanInputs(principal, termMonths);
  if (!(disbursementDate instanceof Date) || Number.isNaN(disbursementDate.getTime())) {
    throw new RangeError("La fecha de desembolso no es válida.");
  }
  const r = monthlyRate(annualRatePercent, convention);
  const payment = installmentAmount(principal, annualRatePercent, termMonths, convention);

  const rows = [];
  let balance = principal;
  for (let i = 1; i <= termMonths; i += 1) {
    const interest = roundCOP(balance * r);
    let principalPart;
    if (i === termMonths) {
      principalPart = balance;
    } else {
      principalPart = Math.min(Math.max(payment - interest, 0), balance);
    }
    balance -= principalPart;
    rows.push({
      installment: i,
      dueDate: addMonths(disbursementDate, i),
      principal: principalPart,
      interest,
      totalDue: principalPart + interest,
      balance
    });
  }
  return rows;
}
