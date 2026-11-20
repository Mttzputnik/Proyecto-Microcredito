export const mockRiskApplication = {
  id: "app-001",
  applicationNumber: "MC-2026-00124",
  status: "UNDER_REVIEW",
  requestedAmount: 3500000,
  requestedTerm: 12,
  purpose: "negocio",
  createdAt: "2026-11-08T10:42:00.000Z",
  applicant: {
    firstName: "María",
    lastName: "García López",
    documentType: "CC",
    documentNumber: "1020304050",
    birthDate: "1988-05-14T00:00:00.000Z",
    municipality: "Manizales",
    residenceZone: "urbana",
    occupation: "Venta de alimentos",
    activityDuration: "1-3",
    monthlyIncome: 4200000,
    monthlyExpenses: 1900000,
    dependents: 2,
    hasExistingDebts: true,
    monthlyDebtPayments: 350000,
  },
  policy: { id: "policy-001", name: "Política de microcrédito general", version: 2026, maximumAmount: 10000000, maximumTermMonths: 24, maxDebtRatio: 0.4 },
  evaluation: { monthlyIncome: 4200000, monthlyExpenses: 1900000, existingObligations: 350000, estimatedInstallment: 345000, debtToIncomeRatio: 0.164, result: "REVIEW", observations: "La capacidad mensual es positiva. Se requiere validar estabilidad de ingresos y soportes de la actividad económica." },
};

export const riskIndicators = [
  { key: "capacity", label: "Capacidad mensual estimada", value: "$ 1.950.000 COP", detail: "Ingresos menos gastos y obligaciones", tone: "positive" },
  { key: "ratio", label: "Relación deuda / ingreso", value: "16,4 %", detail: "Indicador de apoyo, no decisión automática", tone: "positive" },
  { key: "age", label: "Edad al solicitar", value: "38 años", detail: "Cumple el mínimo configurado: 18 años", tone: "positive" },
  { key: "stability", label: "Actividad económica", value: "1 a 3 años", detail: "Requiere soporte para confirmar estabilidad", tone: "review" },
];

export const mockAuditItems = [
  { action: "Solicitud recibida", actor: "Sistema", date: "08/11/2026 · 10:42" },
  { action: "Solicitud asignada para revisión", actor: "Carlos Rodríguez · Oficial de crédito", date: "08/11/2026 · 11:15" },
];
