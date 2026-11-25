import client from "../api/client";

export const auditService = {
  async list(filters = {}) {
    const response = await client.get("/audit", { params: filters });
    return response.data.data;
  }
};
