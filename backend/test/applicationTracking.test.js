import test from "node:test";
import assert from "node:assert/strict";
import { createTrackingCredential, hashTrackingToken, matchesTrackingToken, toPublicTrackingStatus } from "../src/services/applicationTracking.service.js";

test("genera un token privado aleatorio y almacenable como hash", () => {
  const credential = createTrackingCredential();
  assert.equal(typeof credential.token, "string");
  assert.ok(credential.token.length >= 40);
  assert.equal(credential.tokenHash, hashTrackingToken(credential.token));
  assert.equal(credential.token.includes(credential.tokenHash), false);
});

test("valida únicamente el token que corresponde al hash almacenado", () => {
  const credential = createTrackingCredential();
  assert.equal(matchesTrackingToken(credential.token, credential.tokenHash), true);
  assert.equal(matchesTrackingToken("token-incorrecto", credential.tokenHash), false);
});

test("rechaza hashes inválidos sin lanzar excepciones", () => {
  assert.equal(matchesTrackingToken("cualquier-token", "hash-invalido"), false);
  assert.equal(matchesTrackingToken(null, "a".repeat(64)), false);
});


test("la proyección pública de seguimiento excluye datos personales y detalles internos", () => {
  const createdAt = new Date("2026-11-25T10:00:00.000Z");
  const updatedAt = new Date("2026-11-25T11:00:00.000Z");
  const result = toPublicTrackingStatus({
    applicationNumber: "MC-2026-AB12CD34",
    status: "REJECTED",
    createdAt,
    updatedAt,
    applicant: { documentNumber: "123456789", monthlyIncome: 5000000 },
    requestedAmount: 12000000,
    trackingCredential: { tokenHash: "a".repeat(64) },
    assignedOfficerId: "a".repeat(24),
    reconsideration: { status: "PENDING_REVIEW", outcome: null },
    decisions: [{ justification: "Información interna" }]
  });

  assert.deepEqual(result, {
    applicationNumber: "MC-2026-AB12CD34",
    status: "REJECTED",
    createdAt,
    updatedAt
  });
  assert.equal("applicant" in result, false);
  assert.equal("reconsideration" in result, false);
  assert.equal("trackingCredential" in result, false);
});
