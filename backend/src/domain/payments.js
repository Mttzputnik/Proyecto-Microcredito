// Aplicación de pagos a las cuotas. Funciones puras.
//
// SUPUESTOS (ver docs/SUPUESTOS-PARA-REVISION.md):
//  P1. Un pago se aplica a la cuota pendiente MÁS ANTIGUA primero, y lo que sobre pasa a la siguiente
//      (esto cubre pagos parciales y anticipados).
//  P2. Dentro de una cuota se paga primero el interés y después el capital.
//  P3. No se acepta un pago mayor al saldo total pendiente del préstamo.
//  P4. Importes en pesos enteros.

export const PAYABLE_STATUSES = Object.freeze(["PENDING", "PARTIALLY_PAID", "OVERDUE"]);

export const outstanding = (installment) => Math.max(0, installment.totalDue - (installment.paidAmount ?? 0));

export const totalOutstanding = (installments) =>
  installments.filter((i) => PAYABLE_STATUSES.includes(i.status)).reduce((sum, i) => sum + outstanding(i), 0);

// `installments` debe venir ordenado por número de cuota ascendente.
export function allocatePayment(installments, amount) {
  if (!Number.isInteger(amount) || amount <= 0) throw new RangeError("El pago debe ser un entero positivo en pesos.");

  let remaining = amount;
  const allocations = [];
  for (const installment of installments) {
    if (remaining <= 0) break;
    if (!PAYABLE_STATUSES.includes(installment.status)) continue;
    const due = outstanding(installment);
    if (due <= 0) continue;

    const applied = Math.min(remaining, due);
    const paidBefore = installment.paidAmount ?? 0;
    const paidAfter = paidBefore + applied;
    const interestPaid = Math.min(paidAfter, installment.interest) - Math.min(paidBefore, installment.interest);

    allocations.push({
      scheduleId: installment.id,
      installment: installment.installment,
      applied,
      interestPaid,
      principalPaid: applied - interestPaid,
      paidBefore,
      paidAfter,
      status: paidAfter >= installment.totalDue ? "PAID" : "PARTIALLY_PAID"
    });
    remaining -= applied;
  }
  return { allocations, applied: amount - remaining, remainder: remaining };
}
