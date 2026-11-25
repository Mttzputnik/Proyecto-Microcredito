// Roles técnicos asociados a los actores institucionales del dominio.
// Los solicitantes no tienen una cuenta interna obligatoria: usan el flujo público.
// ADMIN se conserva como rol técnico de bootstrap y gestión de usuarios.
// AUDITOR se conserva únicamente por compatibilidad con cuentas antiguas; no recibe permisos operativos.

export const ROLES = Object.freeze({
  ADMIN: "ADMIN",
  CREDIT_OFFICER: "CREDIT_OFFICER",
  RISK_ANALYST: "analista_riesgo",
  ADMINISTRATIVE_AREA: "administrativo",
  SUPERVISORY_COMMITTEE: "comite_supervisor",
  AUDITOR: "AUDITOR"
});

export const ALL_ROLES = Object.freeze(Object.values(ROLES));

// Matriz inicial derivada de las responsabilidades confirmadas por el Product Owner.
// El acceso a expedientes de oficiales debe limitarse además a sus solicitudes asignadas.
export const PERMISSIONS = Object.freeze({
  // Rol técnico: no equivale a un actor funcional ni hereda permisos de negocio.
  manageUsers: [ROLES.ADMIN],

  // Oficiales: revisión de solicitantes y solicitudes, evaluación de apoyo y decisión humana.
  readApplicants: [ROLES.CREDIT_OFFICER],
  // Los datos originales de un solicitante no se editan después de presentar la solicitud.
  editApplicants: [],
  readApplications: [ROLES.CREDIT_OFFICER],
  changeApplicationStatus: [ROLES.CREDIT_OFFICER],
  evaluateApplications: [ROLES.CREDIT_OFFICER],

  // Analistas de riesgo: configuración y consulta de políticas.
  managePolicies: [ROLES.RISK_ANALYST],
  readPolicies: [ROLES.RISK_ANALYST, ROLES.CREDIT_OFFICER, ROLES.ADMINISTRATIVE_AREA],

  // Área administrativa: seguimiento de préstamos, cronogramas y pagos.
  readLoans: [ROLES.ADMINISTRATIVE_AREA, ROLES.CREDIT_OFFICER],
  manageLoans: [ROLES.ADMINISTRATIVE_AREA],
  registerPayments: [ROLES.ADMINISTRATIVE_AREA],

  // No se asigna la baja/castigo de préstamos a un actor: el PO no definió esa atribución.
  writeOffLoans: [],

  // Reportes agregados: administración y comité supervisor (sin datos identificables).
  readPortfolioReports: [ROLES.ADMINISTRATIVE_AREA, ROLES.SUPERVISORY_COMMITTEE],
  // Consulta detallada de eventos operativos: solo área administrativa.
  readAuditEvents: [ROLES.ADMINISTRATIVE_AREA],

  // Reestructuración: gestión operativa, decisión humana y consulta histórica.
  readRestructurings: [ROLES.ADMINISTRATIVE_AREA, ROLES.CREDIT_OFFICER, ROLES.SUPERVISORY_COMMITTEE],
  createRestructurings: [ROLES.ADMINISTRATIVE_AREA, ROLES.CREDIT_OFFICER],
  decideRestructurings: [ROLES.CREDIT_OFFICER, ROLES.SUPERVISORY_COMMITTEE],
  acceptRestructurings: [ROLES.ADMINISTRATIVE_AREA],
});
