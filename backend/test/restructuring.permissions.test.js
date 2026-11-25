import test from "node:test";
import assert from "node:assert/strict";
import { PERMISSIONS, ROLES } from "../src/domain/roles.js";

test("el oficial consulta solo sus préstamos asignados y puede decidir reestructuraciones", () => {
  assert.equal(PERMISSIONS.readLoans.includes(ROLES.CREDIT_OFFICER), true);
  assert.equal(PERMISSIONS.readRestructurings.includes(ROLES.CREDIT_OFFICER), true);
  assert.equal(PERMISSIONS.createRestructurings.includes(ROLES.CREDIT_OFFICER), true);
  assert.equal(PERMISSIONS.decideRestructurings.includes(ROLES.CREDIT_OFFICER), true);
  assert.equal(PERMISSIONS.registerPayments.includes(ROLES.CREDIT_OFFICER), false);
});

test("el área administrativa registra aceptación y no decide la aprobación", () => {
  assert.equal(PERMISSIONS.acceptRestructurings.includes(ROLES.ADMINISTRATIVE_AREA), true);
  assert.equal(PERMISSIONS.createRestructurings.includes(ROLES.ADMINISTRATIVE_AREA), true);
  assert.equal(PERMISSIONS.decideRestructurings.includes(ROLES.ADMINISTRATIVE_AREA), false);
});

test("el comité solo recibe permisos de consulta y decisión de casos escalados", () => {
  assert.equal(PERMISSIONS.readRestructurings.includes(ROLES.SUPERVISORY_COMMITTEE), true);
  assert.equal(PERMISSIONS.decideRestructurings.includes(ROLES.SUPERVISORY_COMMITTEE), true);
  assert.equal(PERMISSIONS.createRestructurings.includes(ROLES.SUPERVISORY_COMMITTEE), false);
  assert.equal(PERMISSIONS.acceptRestructurings.includes(ROLES.SUPERVISORY_COMMITTEE), false);
});

test("el analista de riesgo configura políticas, pero no solicita ni aprueba acuerdos", () => {
  assert.equal(PERMISSIONS.managePolicies.includes(ROLES.RISK_ANALYST), true);
  assert.equal(PERMISSIONS.createRestructurings.includes(ROLES.RISK_ANALYST), false);
  assert.equal(PERMISSIONS.decideRestructurings.includes(ROLES.RISK_ANALYST), false);
});
