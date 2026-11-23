import client from "../api/client";
import { mockApplications } from "../mocks/data";
const wait = (data, delay = 300) =>
  new Promise((resolve) => setTimeout(() => resolve(data), delay));
const useApi = (import.meta.env.VITE_AUTH_MODE || "api") === "api";
export async function createLoanApplication(payload) {
  const response = await client.post("/applications", payload);
  if (!response.data?.success || !response.data?.data?.applicationNumber)
    throw new Error("El servidor no devolvió una confirmación válida.");
  return response.data.data;
}
export async function trackLoanApplication(credentials) {
  const response = await client.post("/applications/track", credentials);
  return response.data.data;
}

export const applicationService = {
  async list({ status, page = 1, limit = 20 } = {}) {
    if (useApi) {
      const response = await client.get("/applications", {
        params: { ...(status ? { status } : {}), page, limit },
      });
      return response.data;
    }
    return wait({
      success: true,
      data: mockApplications,
      pagination: {
        page: 1,
        limit: mockApplications.length,
        total: mockApplications.length,
        pages: 1,
      },
    });
  },
  async getById(id) {
    if (useApi) {
      const response = await client.get(`/applications/${id}`);
      return response.data.data;
    }
    return wait(
      mockApplications.find((item) => item.id === id) || mockApplications[0],
    );
  },
  async history(id) {
    if (useApi) {
      const response = await client.get(`/applications/${id}/history`);
      return response.data.data;
    }
    return wait([]);
  },
  async updateStatus(id, payload) {
    const response = await client.patch(`/applications/${id}/status`, payload);
    return response.data.data;
  },
  getMine: () => wait(mockApplications[0]),
  create: createLoanApplication,
};