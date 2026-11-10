import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001/api",
  timeout: 15000,
  headers: { "Content-Type": "application/json" }
});

export async function createLoanApplication(payload) {
  const response = await api.post("/applications", payload);
  if (!response.data?.success || !response.data?.data?.applicationNumber) {
    throw new Error("El servidor no devolvió una confirmación válida.");
  }
  return response.data.data;
}
