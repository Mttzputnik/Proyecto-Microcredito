import test from "node:test";
import assert from "node:assert/strict";
import { extractPreviousDelinquencies } from "../src/domain/internalHistory.js";

test("identifica cuotas saldadas después del vencimiento y calcula días calendario", () => {
  const loans = [{
    id: "loan-1",
    loanNumber: "MC-001",
    paymentSchedules: [
      { dueDate: "2026-07-01T00:00:00.000Z", paidAt: "2026-07-12T10:00:00.000Z", totalDue: 100, paidAmount: 100, status: "PAID" },
      { dueDate: "2026-07-10T00:00:00.000Z", paidAt: "2026-07-10T18:00:00.000Z", totalDue: 100, paidAmount: 100, status: "PAID" },
      { dueDate: "2026-07-01T00:00:00.000Z", paidAt: null, totalDue: 100, paidAmount: 0, status: "OVERDUE" },
      { dueDate: "2026-07-01T00:00:00.000Z", paidAt: "2026-07-15T00:00:00.000Z", totalDue: 100, paidAmount: 40, status: "PARTIAL" }
    ]
  }];

  assert.deepEqual(extractPreviousDelinquencies(loans), [{
    loanId: "loan-1",
    loanNumber: "MC-001",
    dueDate: "2026-07-01T00:00:00.000Z",
    settledAt: "2026-07-12T10:00:00.000Z",
    daysLate: 11
  }]);
});

test("devuelve una lista vacía cuando no existen antecedentes", () => {
  assert.deepEqual(extractPreviousDelinquencies([]), []);
});
