import test from "node:test";
import assert from "node:assert/strict";
import { ALL_ROLES, INTERNAL_ROLES, PERMISSIONS, ROLES } from "./roles.js";

test("el catálogo contiene exactamente los seis roles acordados", () => {
  assert.deepEqual(ALL_ROLES, [
    "ADMIN",
    "CREDIT_OFFICER",
    "RISK_ANALYST",
    "COMMITTEE_SUPERVISOR",
    "AUDITOR",
    "APPLICANT"
  ]);
});

test("APPLICANT no se puede crear mediante el endpoint de usuarios internos", () => {
  assert.equal(INTERNAL_ROLES.includes(ROLES.APPLICANT), false);
  assert.equal(INTERNAL_ROLES.length, 5);
});

test("solo ADMIN administra usuarios y políticas", () => {
  assert.deepEqual(PERMISSIONS.manageUsers, [ROLES.ADMIN]);
  assert.deepEqual(PERMISSIONS.managePolicies, [ROLES.ADMIN]);
});

test("evaluación, gestión y decisión final son responsabilidades separadas", () => {
  assert.deepEqual(PERMISSIONS.evaluateApplications, [ROLES.ADMIN, ROLES.RISK_ANALYST]);
  assert.deepEqual(PERMISSIONS.manageApplicationWorkflow, [ROLES.ADMIN, ROLES.CREDIT_OFFICER]);
  assert.deepEqual(PERMISSIONS.decideApplications, [ROLES.ADMIN, ROLES.COMMITTEE_SUPERVISOR]);
});
