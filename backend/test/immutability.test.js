import test from "node:test";
import assert from "node:assert/strict";
import { assertMutationAllowed, IMMUTABLE_MODELS } from "../src/domain/immutability.js";

test("ApplicationApplicantSnapshot es un registro inmutable", () => {
  assert.ok(IMMUTABLE_MODELS.includes("ApplicationApplicantSnapshot"));
  for (const operation of ["update", "updateMany", "upsert", "delete", "deleteMany"]) {
    assert.throws(
      () => assertMutationAllowed("ApplicationApplicantSnapshot", operation),
      (error) => error.code === "IMMUTABLE_RECORD" && error.status === 500
    );
  }
});

test("permite crear snapshots nuevos", () => {
  for (const operation of ["create", "createMany"]) {
    assert.doesNotThrow(() => assertMutationAllowed("ApplicationApplicantSnapshot", operation));
  }
});

test("mantiene las reglas de inmutabilidad de auditoría, decisiones y pagos", () => {
  for (const model of ["AuditLog", "LoanDecision", "Payment"]) {
    assert.throws(() => assertMutationAllowed(model, "update"));
  }
});
