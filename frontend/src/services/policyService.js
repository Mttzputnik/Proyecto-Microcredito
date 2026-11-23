import client from "../api/client";

export const policyService = {
  async getActive() {
    const response = await client.get("/policies/active");
    return response.data.data;
  },
  async list() {
    const response = await client.get("/policies");
    return response.data.data;
  },
  async create(payload) {
    const response = await client.post("/policies", payload);
    return response.data.data;
  }
};
