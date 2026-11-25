import client from "../api/client";

export const riskService = {
  async getApplicationForReview(id) {
    const [applicationResponse, evaluationsResponse, historyResponse] = await Promise.all([
      client.get(`/applications/${id}`),
      client.get(`/applications/${id}/evaluations`),
      client.get(`/applications/${id}/history`)
    ]);
    return {
      ...applicationResponse.data.data,
      evaluations: evaluationsResponse.data.data ?? [],
      auditHistory: historyResponse.data.data ?? []
    };
  },
  async runEvaluation(applicationId) {
    const response = await client.post(`/applications/${applicationId}/evaluations`, {});
    return response.data.data;
  },
  async saveDecision({ applicationId, outcome, justification, conditions }) {
    const response = await client.patch(`/applications/${applicationId}/status`, {
      status: outcome, justification, ...(conditions ? { conditions } : {})
    });
    return response.data.data;
  },
  async verifyConditionalApproval(applicationId, { notes }) {
    const response = await client.patch(`/applications/${applicationId}/conditional-approval/verify`, { notes });
    return response.data.data;
  },
  async verifyResidence(applicationId, { verified, notes }) {
    const response = await client.post(`/applications/${applicationId}/verifications/residence`, { verified, notes });
    return response.data.data;
  }
};
