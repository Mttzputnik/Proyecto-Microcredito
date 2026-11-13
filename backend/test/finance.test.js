import test from "node:test";
import assert from "node:assert/strict";
import { addMonths, buildSchedule, installmentAmount, monthlyRate } from "../src/domain/finance.js";

const sum = (rows, key) => rows.reduce((total, row) => total + row[key], 0);

test("tasa nominal 12 % anual da 1 % mensual y la cuota conocida de 106.619", () => {
  assert.equal(monthlyRate(12, "NOMINAL_ANNUAL"), 0.01);
  assert.equal(installmentAmount(1_200_000, 12, 12, "NOMINAL_ANNUAL"), 106_619);
});

test("tasa efectiva anual: la tasa mensual capitalizada 12 veces vuelve a la anual", () => {
  const r = monthlyRate(24, "EFFECTIVE_ANNUAL");
  assert.ok(Math.abs(Math.pow(1 + r, 12) - 1.24) < 1e-12);
});

test("sin interés la cuota es el capital dividido en partes iguales", () => {
  assert.equal(installmentAmount(1_200_000, 0, 12), 100_000);
  const rows = buildSchedule({ principal: 1_200_000, annualRatePercent: 0, termMonths: 12, disbursementDate: new Date("2026-01-15T00:00:00Z") });
  assert.equal(sum(rows, "interest"), 0);
  assert.equal(sum(rows, "principal"), 1_200_000);
});

for (const convention of ["EFFECTIVE_ANNUAL", "NOMINAL_ANNUAL"]) {
  test(`cronograma ${convention}: el capital suma exactamente el monto y el saldo final es 0`, () => {
    const principal = 1_234_567;
    const rows = buildSchedule({
      principal, annualRatePercent: 27.5, termMonths: 18, disbursementDate: new Date("2026-03-10T00:00:00Z"), convention
    });
    assert.equal(rows.length, 18);
    assert.equal(sum(rows, "principal"), principal);
    assert.equal(rows.at(-1).balance, 0);
    rows.forEach((row, index) => {
      assert.equal(row.installment, index + 1);
      assert.equal(row.totalDue, row.principal + row.interest);
      assert.ok(Number.isInteger(row.totalDue) && row.totalDue > 0);
    });
    // El saldo baja en cada cuota.
    for (let i = 1; i < rows.length; i += 1) assert.ok(rows[i].balance < rows[i - 1].balance);
  });
}

test("el interés de la primera cuota es el saldo por la tasa mensual", () => {
  const rows = buildSchedule({ principal: 1_000_000, annualRatePercent: 12, termMonths: 6, disbursementDate: new Date("2026-01-01T00:00:00Z"), convention: "NOMINAL_ANNUAL" });
  assert.equal(rows[0].interest, 10_000);
});

test("addMonths usa el último día del mes cuando el día no existe", () => {
  assert.equal(addMonths(new Date("2027-01-31T00:00:00Z"), 1).toISOString(), "2027-02-28T00:00:00.000Z");
  assert.equal(addMonths(new Date("2028-01-31T00:00:00Z"), 1).toISOString(), "2028-02-29T00:00:00.000Z");
  assert.equal(addMonths(new Date("2026-11-30T00:00:00Z"), 3).toISOString(), "2027-02-28T00:00:00.000Z");
  assert.equal(addMonths(new Date("2026-12-15T00:00:00Z"), 1).toISOString(), "2027-01-15T00:00:00.000Z");
});

test("las fechas de vencimiento son mensuales y crecientes", () => {
  const rows = buildSchedule({ principal: 500_000, annualRatePercent: 20, termMonths: 4, disbursementDate: new Date("2026-01-31T00:00:00Z") });
  assert.deepEqual(rows.map((r) => r.dueDate.toISOString().slice(0, 10)), ["2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31"]);
});

test("entradas inválidas lanzan error en vez de calcular algo sin sentido", () => {
  assert.throws(() => installmentAmount(0, 10, 12), RangeError);
  assert.throws(() => installmentAmount(1000.5, 10, 12), RangeError);
  assert.throws(() => installmentAmount(1000, 10, 0), RangeError);
  assert.throws(() => monthlyRate(-1), RangeError);
  assert.throws(() => monthlyRate(Number.NaN), RangeError);
  assert.throws(() => buildSchedule({ principal: 1000, annualRatePercent: 10, termMonths: 3, disbursementDate: new Date("x") }), RangeError);
});
