import test from "node:test";
import assert from "node:assert/strict";
import { calculateGraceDays, calculateRestructuringBalance } from "../src/domain/restructuring.js";

test("calcula capital pendiente e intereses vencidos con base en pagos confirmados", () => {
  const schedules = [
    { id: "s1", principal: 80000, interest: 20000, dueDate: new Date("2026-01-01"), totalDue: 100000 },
    { id: "s2", principal: 85000, interest: 15000, dueDate: new Date("2026-12-01"), totalDue: 100000 }
  ];
  const payments = [{ allocations: [{ scheduleId: "s1", principalPaid: 30000, interestPaid: 20000 }] }];
  const result = calculateRestructuringBalance({
    schedules, payments, includeAccruedInterest: true,
    lateInterestTreatment: "NOT_APPLICABLE", lateInterestAmount: 0
  });
  assert.equal(result.principalOutstanding, 135000);
  assert.equal(result.accruedInterestOutstanding, 0);
  assert.equal(result.newPrincipal, 135000);
});

test("incluye intereses vencidos solo cuando la política lo permite", () => {
  const schedules = [{ id: "s1", principal: 90000, interest: 10000, dueDate: new Date("2026-01-01"), totalDue: 100000 }];
  const payments = [];
  const result = calculateRestructuringBalance({
    schedules, payments, includeAccruedInterest: true,
    lateInterestTreatment: "MANUAL_CAPITALIZE", lateInterestAmount: 5000
  });
  assert.equal(result.newPrincipal, 105000);
  assert.equal(result.lateInterestAmount, 5000);
});

test("no acepta un valor manual de mora si la política no lo permite", () => {
  assert.throws(() => calculateRestructuringBalance({
    schedules: [], payments: [], includeAccruedInterest: false,
    lateInterestTreatment: "WAIVE", lateInterestAmount: 1
  }), /no permite ingresar/);
});

test("calcula días de gracia y exige primer vencimiento posterior", () => {
  assert.equal(calculateGraceDays(new Date("2026-01-01T00:00:00Z"), new Date("2026-01-11T00:00:00Z")), 10);
  assert.throws(() => calculateGraceDays(new Date("2026-01-01"), new Date("2026-01-01")), /posterior/);
});
