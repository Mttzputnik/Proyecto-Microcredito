export const mockRejectedApplication = { id: "MC-2026-00121", purpose: "Capital para negocio", amount: 2800000, rejectedAt: "05/11/2026", reason: "La información financiera presentada no permite confirmar capacidad de pago suficiente con la política vigente.", canRequestReview: true };

export const portfolioReport = { asOf: "30/11/2026", totalPortfolio: 42850000, activeLoans: 18, pendingApplications: 12, delinquencyRate: 4.8, approvalRate: 62, averageTicket: 2380000 };
export const portfolioByPurpose = [{ label: "Negocio", value: 44 }, { label: "Herramientas", value: 23 }, { label: "Estudio", value: 18 }, { label: "Vivienda", value: 15 }];
export const equityReport = { womenShare: 58, ruralShare: 36, youngAdultsShare: 22, averageApprovalDays: 3.4, note: "Los porcentajes son agregados y no exponen información personal." };
export const equityByMunicipality = [{ municipality: "Manizales", applications: 42, approved: 27, approvalRate: 64 }, { municipality: "Villamaría", applications: 24, approved: 13, approvalRate: 54 }, { municipality: "Neira", applications: 18, approved: 12, approvalRate: 67 }, { municipality: "Chinchiná", applications: 15, approved: 10, approvalRate: 66 }];
