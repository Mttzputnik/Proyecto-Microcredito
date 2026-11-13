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

test("solo ADMIN gestiona usuarios y el auditor no edita solicitantes", () => {
  assert.deepEqual(PERMISSIONS.manageUsers, [ROLES.ADMIN]);
  assert.equal(PERMISSIONS.editApplicants.includes(ROLES.AUDITOR), false);
  assert.equal(PERMISSIONS.readApplicants.includes(ROLES.AUDITOR), true);
});
