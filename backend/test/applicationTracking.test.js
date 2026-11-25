import test from "node:test";
import assert from "node:assert/strict";
import { createTrackingCredential, hashTrackingToken, matchesTrackingToken, toPublicTrackingStatus, lookupApplicationTracking } from "../src/services/applicationTracking.service.js";

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


test("el seguimiento válido actualiza lastUsedAt y devuelve solo campos públicos", async () => {
  const credential = createTrackingCredential();
  const application = {
    id: "a".repeat(24),
    applicationNumber: "MC-2026-AB12CD34",
    status: "UNDER_REVIEW",
    createdAt: new Date("2026-11-25T10:00:00.000Z"),
    updatedAt: new Date("2026-11-25T11:00:00.000Z"),
    trackingCredential: { tokenHash: credential.tokenHash, revokedAt: null },
    applicant: { documentNumber: "123456789", monthlyIncome: 5000000 },
    requestedAmount: 12000000
  };
  const calls = { find: 0, update: 0 };
  const prisma = {
    loanApplication: {
      findUnique: async ({ where }) => {
        calls.find += 1;
        assert.deepEqual(where, { applicationNumber: application.applicationNumber });
        return application;
      }
    },
    applicationTrackingCredential: {
      update: async ({ where, data }) => {
        calls.update += 1;
        assert.deepEqual(where, { applicationId: application.id });
        assert.ok(data.lastUsedAt instanceof Date);
      }
    }
  };
  const result = await lookupApplicationTracking(prisma, {
    applicationNumber: application.applicationNumber,
    accessToken: credential.token
  });

  assert.deepEqual(result, {
    applicationNumber: application.applicationNumber,
    status: "UNDER_REVIEW",
    createdAt: application.createdAt,
    updatedAt: application.updatedAt
  });
  assert.deepEqual(calls, { find: 1, update: 1 });
});

test("el seguimiento no permite consultar un caso con token incorrecto", async () => {
  const credential = createTrackingCredential();
  const prisma = {
    loanApplication: {
      findUnique: async () => ({
        id: "b".repeat(24),
        applicationNumber: "MC-2026-AB12CD34",
        status: "REJECTED",
        createdAt: new Date(),
        updatedAt: new Date(),
        trackingCredential: { tokenHash: credential.tokenHash, revokedAt: null }
      })
    },
    applicationTrackingCredential: { update: async () => assert.fail("No debe actualizar una credencial inválida") }
  };
  await assert.rejects(
    () => lookupApplicationTracking(prisma, { applicationNumber: "MC-2026-AB12CD34", accessToken: "token-incorrecto" }),
    (error) => error.status === 404 && error.message === "No fue posible validar los datos de consulta."
  );
});

test("el seguimiento trata credenciales revocadas y casos inexistentes con el mismo error", async () => {
  const credential = createTrackingCredential();
  const cases = [
    null,
    {
      id: "c".repeat(24),
      applicationNumber: "MC-2026-AB12CD34",
      status: "REJECTED",
      createdAt: new Date(),
      updatedAt: new Date(),
      trackingCredential: { tokenHash: credential.tokenHash, revokedAt: new Date() }
    }
  ];

  for (const application of cases) {
    const prisma = {
      loanApplication: { findUnique: async () => application },
      applicationTrackingCredential: { update: async () => assert.fail("No debe actualizar una credencial inválida") }
    };
    await assert.rejects(
      () => lookupApplicationTracking(prisma, { applicationNumber: "MC-2026-AB12CD34", accessToken: credential.token }),
      (error) => error.status === 404 && error.message === "No fue posible validar los datos de consulta."
    );
  }
});
