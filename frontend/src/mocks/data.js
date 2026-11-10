export const mockUsers = [
  { id: "u-001", name: "María García López", email: "maria@ejemplo.com", role: "solicitante", document: "1020304050" },
  { id: "u-002", name: "Carlos Rodríguez", email: "carlos@cooperativa.test", role: "oficial_credito", document: "80010020" },
  { id: "u-003", name: "Laura Martínez", email: "laura@cooperativa.test", role: "analista_riesgo", document: "80010021" },
  { id: "u-004", name: "Andrés Pérez", email: "andres@cooperativa.test", role: "administrativo", document: "80010022" },
  { id: "u-005", name: "Comité Supervisor", email: "comite@cooperativa.test", role: "comite_supervisor", document: "80010023" },
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
  solicitante: "Solicitante",
  oficial_credito: "Oficial de crédito",
  analista_riesgo: "Analista de riesgo",
  administrativo: "Administrativo",
  comite_supervisor: "Comité supervisor",
};
