// Roles del sistema. Los nombres se guardan como String en User.role.
// PROPUESTA: la matriz definitiva de roles y permisos es una tarea pendiente del Project Manager.
// Si cambia, se ajusta solo este archivo y las llamadas a authorize(...) en las rutas.

export const ROLES = Object.freeze({
  ADMIN: "ADMIN",
  CREDIT_OFFICER: "CREDIT_OFFICER",
  AUDITOR: "AUDITOR"
});

export const ALL_ROLES = Object.freeze(Object.values(ROLES));

// Quién puede hacer qué (usado por las rutas).
export const PERMISSIONS = Object.freeze({
  manageUsers: [ROLES.ADMIN],
  readApplicants: [ROLES.ADMIN, ROLES.CREDIT_OFFICER, ROLES.AUDITOR],
  editApplicants: [ROLES.ADMIN, ROLES.CREDIT_OFFICER],
  readApplications: [ROLES.ADMIN, ROLES.CREDIT_OFFICER, ROLES.AUDITOR],
  changeApplicationStatus: [ROLES.ADMIN, ROLES.CREDIT_OFFICER]
});
