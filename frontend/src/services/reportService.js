import client from "../api/client";

export const reportService = {
  async getSummary(filters = {}) {
    const response = await client.get("/reports", { params: filters });
    return response.data.data;
  }
};
