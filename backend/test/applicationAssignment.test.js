import test from "node:test";
import assert from "node:assert/strict";
import { assignPendingApplications, selectOfficerByWorkload } from "../src/services/applicationAssignment.service.js";

const officers = [
  { id: "officer-a", createdAt: new Date("2025-01-01T00:00:00Z") },
  { id: "officer-b", createdAt: new Date("2025-02-01T00:00:00Z") }
];

test("selecciona al oficial con menor carga activa", () => {
  const selected = selectOfficerByWorkload(officers, [
    { assignedOfficerId: "officer-a", assignedAt: new Date("2026-01-01T00:00:00Z") },
    { assignedOfficerId: "officer-a", assignedAt: new Date("2026-01-02T00:00:00Z") },
    { assignedOfficerId: "officer-b", assignedAt: new Date("2026-01-03T00:00:00Z") }
  ]);
  assert.equal(selected.officer.id, "officer-b");
  assert.equal(selected.activeCount, 1);
});

test("en empate selecciona al oficial con asignación más antigua", () => {
  const selected = selectOfficerByWorkload(officers, [
    { assignedOfficerId: "officer-a", assignedAt: new Date("2026-01-10T00:00:00Z") },
    { assignedOfficerId: "officer-b", assignedAt: new Date("2026-01-01T00:00:00Z") }
  ]);
  assert.equal(selected.officer.id, "officer-b");
});

test("las asignaciones cerradas no cuentan como carga, pero sí para desempatar", () => {
  const selected = selectOfficerByWorkload(officers, [
    { assignedOfficerId: "officer-a", status: "APPROVED", assignedAt: new Date("2026-01-10T00:00:00Z") },
    { assignedOfficerId: "officer-b", status: "REJECTED", assignedAt: new Date("2026-01-01T00:00:00Z") }
  ]);
  assert.equal(selected.officer.id, "officer-b");
  assert.equal(selected.activeCount, 0);
});

test("si nunca han recibido asignaciones, desempata por antigüedad de cuenta", () => {
  const selected = selectOfficerByWorkload(officers, []);
  assert.equal(selected.officer.id, "officer-a");
});

test("no selecciona oficiales cuando la lista está vacía", () => {
  assert.equal(selectOfficerByWorkload([], []), null);
});

test("procesa solicitudes pendientes en orden y distribuye la carga", async () => {
  const pendingRows = [
    { id: "application-1", status: "PENDING_ASSIGNMENT", createdAt: new Date("2026-01-01T00:00:00Z") },
    { id: "application-2", status: "PENDING_ASSIGNMENT", createdAt: new Date("2026-01-02T00:00:00Z") }
  ];
  const assignedRows = [];
  const auditRows = [];
  const db = {
    user: { findMany: async () => officers },
    loanApplication: {
      findMany: async ({ where }) => where.assignedOfficerId?.in
        ? assignedRows
        : pendingRows.filter((row) => row.status === "PENDING_ASSIGNMENT"),
      updateMany: async ({ where, data }) => {
        const row = pendingRows.find((item) => item.id === where.id && item.status === where.status);
        if (!row) return { count: 0 };
        Object.assign(row, data);
        assignedRows.push({ assignedOfficerId: data.assignedOfficerId, assignedAt: data.assignedAt, createdAt: row.createdAt });
        return { count: 1 };
      },
      count: async () => pendingRows.filter((row) => row.status === "PENDING_ASSIGNMENT").length
    },
    auditLog: { create: async ({ data }) => { auditRows.push(data); return data; } }
  };

  const result = await assignPendingApplications(db);
  assert.deepEqual(result, { assigned: 2, pending: 0 });
  assert.equal(pendingRows[0].assignedOfficerId, "officer-a");
  assert.equal(pendingRows[1].assignedOfficerId, "officer-b");
  assert.equal(pendingRows.every((row) => row.status === "SUBMITTED"), true);
  assert.equal(auditRows.length, 2);
  assert.ok(auditRows.every((row) => row.action === "APPLICATION_AUTO_ASSIGNED"));
});

test("sin oficiales activos conserva la cola pendiente", async () => {
  const db = {
    user: { findMany: async () => [] },
    loanApplication: { count: async () => 3 }
  };
  assert.deepEqual(await assignPendingApplications(db), { assigned: 0, pending: 3 });
});
