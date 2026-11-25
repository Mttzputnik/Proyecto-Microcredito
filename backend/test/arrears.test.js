import test from "node:test";
import assert from "node:assert/strict";
import {
  ARREARS_CATEGORIES,
  classifyArrears,
  classifyArrearsDays,
  daysOverdue
} from "../src/domain/arrears.js";

const today = new Date("2026-11-25T18:30:00.000Z");

test("el vencimiento es día cero y el día siguiente inicia la mora", () => {
  assert.equal(daysOverdue("2026-11-25T05:00:00.000Z", today), 0);
  assert.equal(daysOverdue("2026-11-24T23:59:00.000Z", today), 1);
  assert.equal(daysOverdue("2026-11-26T05:00:00.000Z", today), -1);
});

test("clasifica correctamente los límites de días de mora", () => {
  assert.equal(classifyArrearsDays(0), null);
  assert.equal(classifyArrearsDays(1), ARREARS_CATEGORIES.LIGHT_DELAY);
  assert.equal(classifyArrearsDays(30), ARREARS_CATEGORIES.LIGHT_DELAY);
  assert.equal(classifyArrearsDays(31), ARREARS_CATEGORIES.EARLY_ARREARS);
  assert.equal(classifyArrearsDays(60), ARREARS_CATEGORIES.EARLY_ARREARS);
  assert.equal(classifyArrearsDays(61), ARREARS_CATEGORIES.ESTABLISHED_ARREARS);
});

test("clasifica solo cuotas con saldo pendiente y vencimiento anterior al día actual", () => {
  const rows = classifyArrears([
    { id: "a", installment: 1, dueDate: "2026-11-24T00:00:00.000Z", totalDue: 100, paidAmount: 0, status: "PENDING" },
    { id: "b", installment: 2, dueDate: "2026-11-25T05:00:00.000Z", totalDue: 100, paidAmount: 0, status: "PENDING" },
    { id: "c", installment: 3, dueDate: "2026-11-20T00:00:00.000Z", totalDue: 100, paidAmount: 100, status: "PAID" }
  ], today);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "a");
  assert.equal(rows[0].daysOverdue, 1);
  assert.equal(rows[0].category, ARREARS_CATEGORIES.LIGHT_DELAY);
});
