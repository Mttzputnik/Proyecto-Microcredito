import client from "../api/client";
import { mockUsers } from "../mocks/data";
const wait = (data, delay = 300) =>
  new Promise((resolve) => setTimeout(() => resolve(data), delay));
const useApi = import.meta.env.VITE_AUTH_MODE === "api";
export const applicantService = {
  async list({ search = "", page = 1, limit = 20 } = {}) {
    if (useApi) {
      const response = await client.get("/applicants", {
        params: { ...(search ? { search } : {}), page, limit },
      });
      return response.data;
    }
    return wait({
      success: true,
      data: mockUsers.map((user, index) => ({
        id: user.id,
        firstName: user.name?.split(" ")[0] || user.firstName,
        lastName: user.name?.split(" ").slice(1).join(" ") || user.lastName,
        email: user.email,
        documentNumber: `10${index + 1}234567`,
        phone: "300 000 0000",
        municipality: "Medellín",
        residenceZone: "urbana",
        occupation: "Comerciante",
        createdAt: new Date().toISOString(),
        applications: [],
      })),
      pagination: {
        page: 1,
        limit: mockUsers.length,
        total: mockUsers.length,
        pages: 1,
      },
    });
  },
  async getById(id) {
    if (useApi) {
      const response = await client.get(`/applicants/${id}`);
      return response.data.data;
    }
    const response = await this.list({ limit: 50 });
    return response.data.find((item) => item.id === id) || response.data[0];
  },
  async update(id, changes) {
    if (!useApi) return wait({ ...changes, id });
    const response = await client.patch(`/applicants/${id}`, changes);
    return response.data.data;
  },
};
