import test from "node:test";
import assert from "node:assert/strict";
import { submitReconsideration, decideReconsideration } from "../src/services/reconsideration.service.js";
import { hashTrackingToken } from "../src/services/applicationTracking.service.js";

const originalOfficer = "a".repeat(24);
const alternateOfficer = "b".repeat(24);
const applicationId = "c".repeat(24);
const reconsiderationId = "d".repeat(24);
const token = "x".repeat(48);
const hash = hashTrackingToken(token);

function fakeDb({ status = "REJECTED", existing = null, assignedOfficerId = alternateOfficer } = {}) {
  const calls = { created: [], updates: [], audits: [], appUpdates: [] };
  const tx = {
    loanApplication: {
      findUnique: async () => ({
        id: applicationId, status,
        trackingCredential: { tokenHash: hash, revokedAt: null },
        decisions: status === "REJECTED" ? [{ id: "e".repeat(24), officerId: originalOfficer }] : []
      }),
      findMany: async () => [],
      updateMany: async (args) => { calls.appUpdates.push(args); return { count: 1 }; }
    },
    user: { findMany: async () => [
      { id: alternateOfficer, createdAt: new Date("2026-01-01") },
      { id: "f".repeat(24), createdAt: new Date("2026-02-01") }
    ] },
    reconsideration: {
      findUnique: async () => existing,
      create: async ({ data }) => { calls.created.push(data); return { id: reconsiderationId, status: data.status, submittedAt: new Date(), assignedOfficerId }; },
      updateMany: async (args) => { calls.updates.push(args); return { count: 1 }; }
    },
    auditLog: { create: async ({ data }) => { calls.audits.push(data); return data; } }
  };
  return { calls, $transaction: (fn) => fn(tx), tx };
}

test("solo admite reconsiderar solicitudes rechazadas y autenticadas", async () => {
  const db = fakeDb({ status: "UNDER_REVIEW" });
  await assert.rejects(() => submitReconsideration(db, {
    applicationNumber: "MC-2026-ABC12345", accessToken: token, applicantMessage: "Aporto nueva información que debe revisarse."
  }), (error) => error.status === 409);
  assert.equal(db.calls.created.length, 0);
});

test("crea una única reconsideración y asigna un oficial distinto", async () => {
  const db = fakeDb();
  const result = await submitReconsideration(db, {
    applicationNumber: "MC-2026-ABC12345", accessToken: token, applicantMessage: "Aporto nueva información que debe revisarse."
  });
  assert.equal(result.status, "PENDING_REVIEW");
  assert.notEqual(db.calls.created[0].assignedOfficerId, originalOfficer);
  assert.equal(db.calls.created[0].originalOfficerId, originalOfficer);
  assert.equal(db.calls.audits[0].action, "APPLICATION_RECONSIDERATION_SUBMITTED");
  assert.equal(db.calls.appUpdates.length, 0);
});

test("no permite una segunda reconsideración", async () => {
  const db = fakeDb({ existing: { id: reconsiderationId } });
  await assert.rejects(() => submitReconsideration(db, {
    applicationNumber: "MC-2026-ABC12345", accessToken: token, applicantMessage: "Aporto nueva información que debe revisarse."
  }), (error) => error.status === 409);
  assert.equal(db.calls.created.length, 0);
});

test("el oficial original no puede decidir y la solicitud original no se modifica", async () => {
  const db = fakeDb();
  db.tx.reconsideration.findUnique = async () => ({
    id: reconsiderationId, applicationId, originalOfficerId: originalOfficer,
    assignedOfficerId: originalOfficer, status: "PENDING_REVIEW"
  });
  await assert.rejects(() => decideReconsideration(db, {
    reconsiderationId, actor: { id: originalOfficer }, outcome: "ACCEPTED",
    justification: "La nueva evidencia cambia la evaluación."
  }), (error) => error.status === 404 || error.status === 403);
  assert.equal(db.calls.appUpdates.length, 0);
});

test("el oficial diferente registra resultado y auditoría sin sobrescribir la solicitud", async () => {
  const db = fakeDb();
  db.tx.reconsideration.findUnique = async () => ({
    id: reconsiderationId, applicationId, originalOfficerId: originalOfficer,
    assignedOfficerId: alternateOfficer, status: "PENDING_REVIEW"
  });
  const result = await decideReconsideration(db, {
    reconsiderationId, actor: { id: alternateOfficer }, outcome: "ACCEPTED",
    justification: "La información complementaria permite reconsiderar el resultado."
  });
  assert.equal(result.status, "ACCEPTED");
  assert.equal(db.calls.updates[0].data.outcome, "ACCEPTED");
  assert.equal(db.calls.appUpdates.length, 0);
  assert.equal(db.calls.audits[0].action, "APPLICATION_RECONSIDERATION_DECIDED");
});

test("rechaza una credencial privada incorrecta", async () => {
  const db = fakeDb();
  await assert.rejects(() => submitReconsideration(db, {
    applicationNumber: "MC-2026-ABC12345", accessToken: "z".repeat(48), applicantMessage: "Aporto nueva información que debe revisarse."
  }), (error) => error.status === 404);
  assert.equal(db.calls.created.length, 0);
});

test("no permite resolver dos veces una reconsideración", async () => {
  const db = fakeDb();
  db.tx.reconsideration.findUnique = async () => ({
    id: reconsiderationId, applicationId, originalOfficerId: originalOfficer,
    assignedOfficerId: alternateOfficer, status: "ACCEPTED"
  });
  await assert.rejects(() => decideReconsideration(db, {
    reconsiderationId, actor: { id: alternateOfficer }, outcome: "UPHELD",
    justification: "Se confirma el rechazo original."
  }), (error) => error.status === 409);
  assert.equal(db.calls.updates.length, 0);
});
