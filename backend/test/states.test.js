import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  applicationTransitions,
  loanTransitions,
  installmentTransitions,
  canTransition,
  assertTransition
} from "../src/domain/states.js";

// Los estados "iniciales" son los @default de schema.prisma; no los alcanza ninguna transición.
const schema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
const defaultOf = (model) => {
  const block = schema.match(new RegExp(`model ${model} \\{[\\s\\S]*?\\n\\}`))[0];
  return block.match(/status\s+String\s+@default\("(\w+)"\)/)[1];
};

test("el estado inicial de cada entidad coincide con el default de schema.prisma", () => {
  assert.ok(defaultOf("LoanApplication") in applicationTransitions);
  assert.ok(defaultOf("Loan") in loanTransitions);
  assert.ok(defaultOf("PaymentSchedule") in installmentTransitions);
});

test("todas las transiciones apuntan a estados que existen", () => {
  for (const map of [applicationTransitions, loanTransitions, installmentTransitions]) {
    for (const [from, targets] of Object.entries(map)) {
      for (const to of targets) assert.ok(to in map, `${from} -> ${to} no existe`);
    }
  }
});

test("una solicitud rechazada o cancelada no puede volver a abrirse", () => {
  assert.equal(canTransition(applicationTransitions, "REJECTED", "APPROVED"), false);
  assert.equal(canTransition(applicationTransitions, "CANCELLED", "UNDER_REVIEW"), false);
});

test("una solicitud no pasa de SUBMITTED a APPROVED sin revisión", () => {
  assert.equal(canTransition(applicationTransitions, "SUBMITTED", "APPROVED"), false);
  assert.equal(canTransition(applicationTransitions, "SUBMITTED", "UNDER_REVIEW"), true);
});

test("un préstamo no se activa dos veces ni vuelve a pendiente de desembolso", () => {
  assert.equal(canTransition(loanTransitions, "PENDING_DISBURSEMENT", "ACTIVE"), true);
  assert.equal(canTransition(loanTransitions, "ACTIVE", "PENDING_DISBURSEMENT"), false);
  assert.equal(canTransition(loanTransitions, "PAID", "ACTIVE"), false);
});

test("una cuota pagada es final", () => {
  assert.deepEqual(installmentTransitions.PAID, []);
});

test("assertTransition lanza 409 con mensaje claro", () => {
  assert.throws(
    () => assertTransition(applicationTransitions, "REJECTED", "APPROVED", "Solicitud"),
    (e) => e.status === 409 && /REJECTED a APPROVED/.test(e.message)
  );
  assert.doesNotThrow(() => assertTransition(applicationTransitions, "SUBMITTED", "UNDER_REVIEW"));
});

test("assertTransition lanza 500 si el estado de origen no existe", () => {
  assert.throws(() => assertTransition(loanTransitions, "INVENTADO", "ACTIVE"), (e) => e.status === 500);
});
