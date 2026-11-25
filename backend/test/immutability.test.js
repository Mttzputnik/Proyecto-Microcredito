import test from "node:test";
import assert from "node:assert/strict";
import { assertMutationAllowed, IMMUTABLE_MODELS } from "../src/domain/immutability.js";

const MUTATIONS = ["update", "updateMany", "updateManyAndReturn", "upsert", "delete", "deleteMany"];

test("todos los modelos históricos son append-only", () => {
  for (const model of ["AuditLog", "LoanDecision", "Payment", "ApplicationApplicantSnapshot"]) {
    assert.ok(IMMUTABLE_MODELS.includes(model));
    for (const operation of MUTATIONS) {
      assert.throws(
        () => assertMutationAllowed(model, operation),
        (error) => error.code === "IMMUTABLE_RECORD" && error.status === 500
      );
    }
  }
});

test("los modelos históricos permiten crear registros nuevos", () => {
  for (const model of IMMUTABLE_MODELS) {
    for (const operation of ["create", "createMany", "createManyAndReturn"]) {
      assert.doesNotThrow(() => assertMutationAllowed(model, operation));
    }
  }
});

test("los modelos operativos siguen permitiendo sus mutaciones normales", () => {
  for (const operation of MUTATIONS) {
    assert.doesNotThrow(() => assertMutationAllowed("Loan", operation));
  }
});
