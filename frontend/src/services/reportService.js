import {
  equityByMunicipality,
  equityReport,
  portfolioByPurpose,
  portfolioReport,
  mockRejectedApplication,
} from "../mocks/reportData";
const wait = (data, delay = 300) =>
  new Promise((resolve) => setTimeout(() => resolve(data), delay));
export const reportService = {
  getPortfolio: () => wait({ portfolioReport, portfolioByPurpose }),
  getEquity: () => wait({ equityReport, equityByMunicipality }),
};
export const reconsiderationService = {
  getRejectedApplication: () => wait(mockRejectedApplication),
  submit: (payload) =>
    wait({
      ...payload,
      id: "reconsideration-mock-001",
      status: "SUBMITTED",
      submittedAt: new Date().toISOString(),
    }),
};

