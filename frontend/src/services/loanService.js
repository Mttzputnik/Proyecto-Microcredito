import client from "../api/client";

export const loanService = {
  async list({ status, page = 1, limit = 20 } = {}) {
    const response = await client.get("/loans", { params: { status, page, limit } });
    return response.data;
  },
  async getById(id) {
    const response = await client.get(`/loans/${id}`);
    return response.data.data;
  },
  async formalize(applicationId) {
    const response = await client.post("/loans", { applicationId });
    return response.data.data;
  },
  async disburse(id, disbursementDate) {
    const response = await client.post(`/loans/${id}/disburse`, disbursementDate ? { disbursementDate } : {});
    return response.data.data;
  },
  async registerPayment(id, payload) {
    const response = await client.post(`/loans/${id}/payments`, payload);
    return response.data.data;
  },
  async listArrears() {
    const response = await client.get("/loans/arrears");
    return response.data.data;
  },
  async listArrearsAlerts() {
    const response = await client.get("/loans/alerts");
    return response.data.data;
  },
  async markAlertRead(id) {
    const response = await client.patch(`/loans/alerts/${id}/read`);
    return response.data.data;
  },
  async registerCollectionAction(id, payload) {
    const response = await client.post(`/loans/${id}/collection-actions`, payload);
    return response.data.data;
  },
  async listRestructuringPolicies() {\n    const response = await client.get("/loans/restructuring-policies");\n    return response.data.data;\n  },\n  async createRestructuringPolicy(payload) {\n    const response = await client.post("/loans/restructuring-policies", payload);\n    return response.data.data;\n  },\n  async listRestructurings() {\n    const response = await client.get("/loans/restructurings");\n    return response.data.data;\n  },\n  async createRestructuring(loanId, payload) {\n    const response = await client.post(`/loans/${loanId}/restructurings`, payload);\n    return response.data.data;\n  },\n  async decideRestructuring(id, payload) {\n    const response = await client.patch(`/loans/restructurings/${id}/decision`, payload);\n    return response.data.data;\n  },\n  async acceptRestructuring(id, payload) {\n    const response = await client.post(`/loans/restructurings/${id}/accept`, payload);\n    return response.data.data;\n  },\n  async refreshArrears(id) {
    const response = await client.post(`/loans/${id}/refresh-arrears`);
    return response.data.data;
  },
};
