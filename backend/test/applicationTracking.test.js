import test from "node:test";
import assert from "node:assert/strict";
import { createTrackingCredential, hashTrackingToken, matchesTrackingToken } from "../src/services/applicationTracking.service.js";

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
