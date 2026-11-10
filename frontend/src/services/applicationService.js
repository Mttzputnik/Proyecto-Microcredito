import { mockApplications } from "../mocks/data";
const wait = (data, delay = 300) => new Promise((resolve) => setTimeout(() => resolve(data), delay));
export const applicationService = { list: () => wait(mockApplications), getMine: () => wait(mockApplications[0]), create: (payload) => wait({ ...mockApplications[0], ...payload, id: "MC-2026-00125", status: "En revisión" }) };
