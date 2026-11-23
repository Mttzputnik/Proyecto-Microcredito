import test from "node:test";
import assert from "node:assert/strict";
import { authorize } from "../src/middleware/authorize.js";
import { PERMISSIONS, ROLES } from "../src/domain/roles.js";

const run = (middleware, user) => {
  let received = "no-llamado";
  middleware({ user }, {}, (arg) => { received = arg; });
  return received;
};

test("authorize deja pasar a un rol permitido", () => {
  assert.equal(run(authorize(...PERMISSIONS.changeApplicationStatus), { role: ROLES.CREDIT_OFFICER }), undefined);
});

test("authorize responde 403 a un rol no permitido", () => {
  const error = run(authorize(...PERMISSIONS.changeApplicationStatus), { role: ROLES.AUDITOR });
  assert.equal(error.status, 403);
});

test("authorize responde 401 si no hay usuario en la petición", () => {
  const error = run(authorize(ROLES.ADMIN), undefined);
  assert.equal(error.status, 401);
});

test("ADMIN conserva únicamente la gestión técnica de usuarios", () => {
  assert.deepEqual(PERMISSIONS.manageUsers, [ROLES.ADMIN]);
  assert.equal(PERMISSIONS.readApplications.includes(ROLES.ADMIN), false);
  assert.equal(PERMISSIONS.registerPayments.includes(ROLES.ADMIN), false);
});

test("el oficial de crédito puede revisar, evaluar y decidir solicitudes", () => {
  assert.equal(PERMISSIONS.readApplicants.includes(ROLES.CREDIT_OFFICER), true);
  assert.equal(PERMISSIONS.readApplications.includes(ROLES.CREDIT_OFFICER), true);
  assert.equal(PERMISSIONS.evaluateApplications.includes(ROLES.CREDIT_OFFICER), true);
  assert.equal(PERMISSIONS.changeApplicationStatus.includes(ROLES.CREDIT_OFFICER), true);
});

test("el analista de riesgo administra políticas, pero no registra pagos", () => {
  assert.equal(PERMISSIONS.managePolicies.includes(ROLES.RISK_ANALYST), true);
  assert.equal(PERMISSIONS.readPolicies.includes(ROLES.RISK_ANALYST), true);
  assert.equal(PERMISSIONS.registerPayments.includes(ROLES.RISK_ANALYST), false);
  assert.equal(PERMISSIONS.readApplicants.includes(ROLES.RISK_ANALYST), false);
});

test("el área administrativa gestiona préstamos y pagos, no decide solicitudes", () => {
  assert.equal(PERMISSIONS.readLoans.includes(ROLES.ADMINISTRATIVE_AREA), true);
  assert.equal(PERMISSIONS.manageLoans.includes(ROLES.ADMINISTRATIVE_AREA), true);
  assert.equal(PERMISSIONS.registerPayments.includes(ROLES.ADMINISTRATIVE_AREA), true);
  assert.equal(PERMISSIONS.changeApplicationStatus.includes(ROLES.ADMINISTRATIVE_AREA), false);
  assert.equal(PERMISSIONS.managePolicies.includes(ROLES.ADMINISTRATIVE_AREA), false);
});

test("el comité supervisor no tiene permisos operativos ni acceso a expedientes individuales", () => {
  assert.equal(PERMISSIONS.readApplicants.includes(ROLES.SUPERVISORY_COMMITTEE), false);
  assert.equal(PERMISSIONS.readApplications.includes(ROLES.SUPERVISORY_COMMITTEE), false);
  assert.equal(PERMISSIONS.readLoans.includes(ROLES.SUPERVISORY_COMMITTEE), false);
  assert.equal(PERMISSIONS.managePolicies.includes(ROLES.SUPERVISORY_COMMITTEE), false);
  assert.equal(PERMISSIONS.registerPayments.includes(ROLES.SUPERVISORY_COMMITTEE), false);
});

test("AUDITOR se conserva por compatibilidad, pero no tiene acceso operativo", () => {
  assert.equal(PERMISSIONS.readApplicants.includes(ROLES.AUDITOR), false);
  assert.equal(PERMISSIONS.readApplications.includes(ROLES.AUDITOR), false);
  assert.equal(PERMISSIONS.readLoans.includes(ROLES.AUDITOR), false);
  assert.equal(PERMISSIONS.managePolicies.includes(ROLES.AUDITOR), false);
});

test("ningún rol puede editar datos originales del solicitante por esta ruta", () => {
  assert.deepEqual(PERMISSIONS.editApplicants, []);
});

test("no se habilita castigo de préstamos sin atribución confirmada por el PO", () => {
  assert.deepEqual(PERMISSIONS.writeOffLoans, []);
});
