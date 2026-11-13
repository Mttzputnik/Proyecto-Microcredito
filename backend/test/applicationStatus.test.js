import test from "node:test";
import assert from "node:assert/strict";
import { changeApplicationStatus } from "../src/services/applicationStatus.service.js";

// Prisma falso en memoria: registra lo que el servicio escribe.
function fakePrisma(initialStatus, { updateCount = 1 } = {}) {
  const calls = { decisions: [], audits: [], updates: [] };
  const tx = {
    loanApplication: {
      findUnique: async () => (initialStatus ? { id: "a".repeat(24), status: initialStatus } : null),
      updateMany: async (args) => { calls.updates.push(args); return { count: updateCount }; }
    },
    loanDecision: { create: async ({ data }) => { calls.decisions.push(data); return { id: "d".repeat(24) }; } },
    auditLog: { create: async ({ data }) => { calls.audits.push(data); return data; } }
  };
  return { calls, $transaction: (fn) => fn(tx) };
}

const actor = { id: "b".repeat(24) };
const applicationId = "a".repeat(24);

test("pasar de SUBMITTED a UNDER_REVIEW cambia el estado y deja auditoría", async () => {
  const db = fakePrisma("SUBMITTED");
  const result = await changeApplicationStatus(db, { applicationId, toStatus: "UNDER_REVIEW", actor });
  assert.equal(result.status, "UNDER_REVIEW");
  assert.equal(db.calls.updates[0].where.status, "SUBMITTED");
  assert.equal(db.calls.decisions.length, 0);
  assert.equal(db.calls.audits.length, 1);
  assert.equal(db.calls.audits[0].action, "APPLICATION_STATUS_CHANGED");
});

test("aprobar exige justificación y no escribe nada sin ella", async () => {
  const db = fakePrisma("UNDER_REVIEW");
  await assert.rejects(
    () => changeApplicationStatus(db, { applicationId, toStatus: "APPROVED", actor }),
    (e) => e.status === 400
  );
  assert.equal(db.calls.updates.length, 0);
});

test("aprobar con justificación registra la decisión y la auditoría", async () => {
  const db = fakePrisma("UNDER_REVIEW");
  const result = await changeApplicationStatus(db, {
    applicationId, toStatus: "APPROVED", actor, justification: "  Ingresos suficientes y buen historial.  "
  });
  assert.equal(result.decisionId, "d".repeat(24));
  assert.equal(db.calls.decisions[0].outcome, "APPROVED");
  assert.equal(db.calls.decisions[0].officerId, actor.id);
  assert.equal(db.calls.decisions[0].justification, "Ingresos suficientes y buen historial.");
  assert.equal(db.calls.audits[0].metadata.to, "APPROVED");
});

test("una transición no permitida responde 409 y no escribe nada", async () => {
  const db = fakePrisma("REJECTED");
  await assert.rejects(
    () => changeApplicationStatus(db, { applicationId, toStatus: "APPROVED", actor, justification: "Cambio de opinión total" }),
    (e) => e.status === 409
  );
  assert.equal(db.calls.updates.length, 0);
  assert.equal(db.calls.audits.length, 0);
});

test("solicitud inexistente responde 404", async () => {
  const db = fakePrisma(null);
  await assert.rejects(
    () => changeApplicationStatus(db, { applicationId, toStatus: "UNDER_REVIEW", actor }),
    (e) => e.status === 404
  );
});

test("si otro usuario cambió el estado en paralelo responde 409", async () => {
  const db = fakePrisma("SUBMITTED", { updateCount: 0 });
  await assert.rejects(
    () => changeApplicationStatus(db, { applicationId, toStatus: "UNDER_REVIEW", actor }),
    (e) => e.status === 409 && /cambió/.test(e.message)
  );
  assert.equal(db.calls.audits.length, 0);
});
