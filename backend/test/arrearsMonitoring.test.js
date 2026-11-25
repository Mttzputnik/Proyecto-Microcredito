import test from "node:test";
import assert from "node:assert/strict";
import { monitorArrears } from "../src/services/loan.service.js";

function memoryDb(schedules) {
  const state = { schedules, alerts: [], audits: [] };
  const db = {
    state,
    $transaction: (callback) => callback(db),
    paymentSchedule: {
      findMany: async () => state.schedules,
      updateMany: async ({ where, data }) => {
        const row = state.schedules.find((item) => item.id === where.id && item.status === where.status);
        if (!row) return { count: 0 };
        Object.assign(row, data);
        return { count: 1 };
      }
    },
    alert: {
      findFirst: async ({ where }) => state.alerts.find((item) =>
        item.scheduleId === where.scheduleId &&
        item.type === where.type &&
        item.referenceDate.getTime() === where.referenceDate.getTime()
      ) ?? null,
      create: async ({ data }) => {
        const row = { id: `alert-${state.alerts.length + 1}`, ...data };
        state.alerts.push(row);
        return row;
      }
    },
    auditLog: {
      create: async ({ data }) => {
        state.audits.push(data);
        return data;
      }
    }
  };
  return db;
}

const today = new Date("2026-11-25T12:00:00.000Z");
const due = (daysFromToday) => new Date(Date.UTC(2026, 10, 25 - daysFromToday));

test("monitoreo actualiza cuotas vencidas y genera alertas de mora y vencimiento", async () => {
  const db = memoryDb([
    { id: "s1", loanId: "l1", installment: 1, dueDate: due(1), status: "PENDING", totalDue: 100, paidAmount: 0 },
    { id: "s31", loanId: "l2", installment: 1, dueDate: due(31), status: "PARTIALLY_PAID", totalDue: 100, paidAmount: 20 },
    { id: "s61", loanId: "l3", installment: 1, dueDate: due(61), status: "PENDING", totalDue: 100, paidAmount: 0 },
    { id: "sFuture", loanId: "l4", installment: 1, dueDate: due(-2), status: "PENDING", totalDue: 100, paidAmount: 0 }
  ]);

  const result = await monitorArrears(db, { today, upcomingDays: 3 });
  assert.equal(result.checked, 4);
  assert.equal(result.updated, 3);
  assert.equal(result.alertsCreated, 7);
  assert.deepEqual(db.state.schedules.map((row) => row.status), ["OVERDUE", "OVERDUE", "OVERDUE", "PENDING"]);
  assert.equal(db.state.alerts.filter((row) => row.type === "ARREARS_LIGHT").length, 3);
  assert.equal(db.state.alerts.filter((row) => row.type === "ARREARS_EARLY").length, 2);
  assert.equal(db.state.alerts.filter((row) => row.type === "ARREARS_ESTABLISHED").length, 1);
  assert.equal(db.state.alerts.filter((row) => row.type === "UPCOMING_PAYMENT").length, 1);
});

test("monitoreo es idempotente: no duplica alertas ni vuelve a actualizar cuotas", async () => {
  const db = memoryDb([
    { id: "s1", loanId: "l1", installment: 1, dueDate: due(31), status: "PENDING", totalDue: 100, paidAmount: 0 }
  ]);

  const first = await monitorArrears(db, { today, upcomingDays: 3 });
  const second = await monitorArrears(db, { today, upcomingDays: 3 });
  assert.equal(first.alertsCreated, 2);
  assert.equal(second.alertsCreated, 0);
  assert.equal(second.updated, 0);
  assert.equal(db.state.alerts.length, 2);
});

test("rechaza una ventana de alertas previa fuera del rango permitido", async () => {
  const db = memoryDb([]);
  await assert.rejects(
    () => monitorArrears(db, { today, upcomingDays: 120 }),
    /entero entre 0 y 90/
  );
});
