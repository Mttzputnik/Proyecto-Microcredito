import test from "node:test";
import assert from "node:assert/strict";
import { allocatePayment, outstanding, totalOutstanding } from "../src/domain/payments.js";
import { classifyArrears, daysOverdue } from "../src/domain/arrears.js";
import { assertMutationAllowed } from "../src/domain/immutability.js";

const inst = (n, over = {}) => ({
  id: `i${n}`, installment: n, interest: 10_000, principal: 90_000, totalDue: 100_000,
  paidAmount: 0, status: "PENDING", dueDate: new Date(Date.UTC(2026, n, 1)), ...over
});

test("un pago exacto cierra la primera cuota", () => {
  const result = allocatePayment([inst(1), inst(2)], 100_000);
  assert.equal(result.allocations.length, 1);
  assert.equal(result.allocations[0].status, "PAID");
  assert.equal(result.remainder, 0);
});

test("un pago parcial deja la cuota PARTIALLY_PAID y paga primero el interés", () => {
  const result = allocatePayment([inst(1)], 4_000);
  assert.equal(result.allocations[0].status, "PARTIALLY_PAID");
  assert.equal(result.allocations[0].interestPaid, 4_000);
  assert.equal(result.allocations[0].principalPaid, 0);
});

test("el siguiente pago completa el interés y sigue con el capital", () => {
  const result = allocatePayment([inst(1, { paidAmount: 4_000, status: "PARTIALLY_PAID" })], 50_000);
  assert.equal(result.allocations[0].interestPaid, 6_000);
  assert.equal(result.allocations[0].principalPaid, 44_000);
  assert.equal(result.allocations[0].paidAfter, 54_000);
});

test("un pago mayor a una cuota pasa a las siguientes (pago anticipado)", () => {
  const result = allocatePayment([inst(1), inst(2), inst(3)], 250_000);
  assert.deepEqual(result.allocations.map((a) => [a.installment, a.applied, a.status]),
    [[1, 100_000, "PAID"], [2, 100_000, "PAID"], [3, 50_000, "PARTIALLY_PAID"]]);
  assert.equal(result.remainder, 0);
});

test("lo que excede el saldo total queda como remanente para que el servicio lo rechace", () => {
  const result = allocatePayment([inst(1), inst(2)], 250_000);
  assert.equal(result.applied, 200_000);
  assert.equal(result.remainder, 50_000);
});

test("ignora cuotas ya pagadas o reemplazadas y paga las vencidas primero", () => {
  const rows = [inst(1, { status: "PAID", paidAmount: 100_000 }), inst(2, { status: "OVERDUE" }), inst(3)];
  const result = allocatePayment(rows, 100_000);
  assert.equal(result.allocations[0].installment, 2);
  assert.equal(totalOutstanding(rows), 200_000);
});

test("montos inválidos lanzan error", () => {
  assert.throws(() => allocatePayment([inst(1)], 0), RangeError);
  assert.throws(() => allocatePayment([inst(1)], 10.5), RangeError);
  assert.throws(() => allocatePayment([inst(1)], -5), RangeError);
  assert.equal(outstanding(inst(1, { paidAmount: 150_000 })), 0);
});

test("mora: solo cuotas vencidas con saldo, con sus días", () => {
  const today = new Date("2026-04-10T15:00:00Z");
  const rows = [
    inst(1, { status: "PAID", paidAmount: 100_000, dueDate: new Date("2026-02-01T00:00:00Z") }),
    inst(2, { dueDate: new Date("2026-03-01T00:00:00Z") }),
    inst(3, { status: "OVERDUE", dueDate: new Date("2026-04-01T00:00:00Z"), paidAmount: 30_000 }),
    inst(4, { dueDate: new Date("2026-04-10T00:00:00Z") }),
    inst(5, { dueDate: new Date("2026-05-01T00:00:00Z") })
  ];
  const arrears = classifyArrears(rows, today);
  assert.deepEqual(arrears.map((a) => [a.installment, a.daysOverdue, a.outstanding, a.needsStatusUpdate]),
    [[2, 40, 100_000, true], [3, 9, 70_000, false]]);
  assert.equal(daysOverdue(new Date("2026-04-10T00:00:00Z"), today), 0);
});

test("AuditLog, LoanDecision y Payment no se pueden editar ni borrar", () => {
  for (const model of ["AuditLog", "LoanDecision", "Payment"]) {
    for (const op of ["update", "updateMany", "upsert", "delete", "deleteMany"]) {
      assert.throws(() => assertMutationAllowed(model, op), (e) => e.code === "IMMUTABLE_RECORD");
    }
    assert.doesNotThrow(() => assertMutationAllowed(model, "create"));
    assert.doesNotThrow(() => assertMutationAllowed(model, "findMany"));
  }
  assert.doesNotThrow(() => assertMutationAllowed("PaymentSchedule", "update"));
  assert.doesNotThrow(() => assertMutationAllowed("LoanApplication", "updateMany"));
});
