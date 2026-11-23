export const mockUsers = [
  { id: "u-001", name: "María García López", email: "maria@ejemplo.com", role: "APPLICANT", document: "1020304050" },
  { id: "u-002", name: "Carlos Rodríguez", email: "carlos@cooperativa.test", role: "CREDIT_OFFICER", document: "80010020" },
  { id: "u-003", name: "Laura Martínez", email: "laura@cooperativa.test", role: "RISK_ANALYST", document: "80010021" },
  { id: "u-004", name: "Andrés Pérez", email: "andres@cooperativa.test", role: "ADMIN", document: "80010022" },
  { id: "u-005", name: "Comité Supervisor", email: "comite@cooperativa.test", role: "COMMITTEE_SUPERVISOR", document: "80010023" },
  { id: "u-006", name: "Auditor de prueba", email: "auditor@cooperativa.test", role: "AUDITOR", document: "80010024" },
];

export const mockApplications = [
  { id: "MC-2026-00124", applicant: "María García López", purpose: "Compra de mercancía", amount: 3500000, status: "En revisión", createdAt: "08/11/2026", progress: 65 },
  { id: "MC-2026-00123", applicant: "Julián Torres", purpose: "Herramientas de trabajo", amount: 2200000, status: "Pendiente de documentos", createdAt: "07/11/2026", progress: 40 },
  { id: "MC-2026-00122", applicant: "Diana Gómez", purpose: "Capital para negocio", amount: 5000000, status: "Aprobada con condiciones", createdAt: "05/11/2026", progress: 100 },
];

export const mockLoan = { id: "PR-2026-00087", amount: 3500000, balance: 2875000, nextPayment: 325000, nextPaymentDate: "15/12/2026", status: "Activo — al día", paidInstallments: 3, totalInstallments: 12 };

export const mockPayments = [
  { id: "P-003", date: "15/11/2026", amount: 325000, concept: "Cuota 3 de 12", status: "Confirmado" },
  { id: "P-002", date: "15/10/2026", amount: 325000, concept: "Cuota 2 de 12", status: "Confirmado" },
  { id: "P-001", date: "15/09/2026", amount: 325000, concept: "Cuota 1 de 12", status: "Confirmado" },
];

export const roleLabels = {
  ADMIN: "Administrador",
  CREDIT_OFFICER: "Oficial de crédito",
  RISK_ANALYST: "Analista de riesgo",
  COMMITTEE_SUPERVISOR: "Comité supervisor",
  AUDITOR: "Auditor",
  APPLICANT: "Solicitante",
};
