import test from "node:test";
import assert from "node:assert/strict";
import { selectOfficerByWorkload } from "../src/services/applicationAssignment.service.js";

const officers = [
  { id: "a", createdAt: new Date("2025-01-01T00:00:00Z") },
  { id: "b", createdAt: new Date("2025-02-01T00:00:00Z") },
  { id: "c", createdAt: new Date("2025-03-01T00:00:00Z") }
];

test("selecciona al oficial con menor carga activa", () => {
  const selected = selectOfficerByWorkload(officers, [
    { assignedOfficerId: "a", assignedAt: new Date("2026-01-01T00:00:00Z") },
    { assignedOfficerId: "a", assignedAt: new Date("2026-01-02T00:00:00Z") },
    { assignedOfficerId: "b", assignedAt: new Date("2026-01-03T00:00:00Z") }
  ]);
  assert.equal(selected.officer.id, "c");
  assert.equal(selected.activeCount, 0);
});

test("en empate selecciona al oficial con asignación más antigua", () => {
  const selected = selectOfficerByWorkload(officers, [
    { assignedOfficerId: "a", assignedAt: new Date("2026-01-10T00:00:00Z") },
    { assignedOfficerId: "b", assignedAt: new Date("2026-01-01T00:00:00Z") },
    { assignedOfficerId: "c", assignedAt: new Date("2026-01-05T00:00:00Z") }
  ]);
  assert.equal(selected.officer.id, "b");
});

test("si nunca han recibido asignaciones, desempata por antigüedad de cuenta", () => {
  const selected = selectOfficerByWorkload(officers, []);
  assert.equal(selected.officer.id, "a");
});

test("no selecciona oficiales cuando la lista está vacía", () => {
  assert.equal(selectOfficerByWorkload([], []), null);
});
