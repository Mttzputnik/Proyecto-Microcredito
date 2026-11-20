import { mockRiskApplication } from "../mocks/riskData";

const wait = (data, delay = 300) => new Promise((resolve) => setTimeout(() => resolve(data), delay));

export const riskService = {
  getApplicationForReview: (id) => wait({ ...mockRiskApplication, id: id || mockRiskApplication.id }),
  calculateSupportIndicators: (application) => wait(application.evaluation),
  saveDecision: (payload) => wait({ ...payload, id: "decision-mock-001", decidedAt: new Date().toISOString() }),
};
