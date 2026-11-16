import client from "../api/client";
import { mockUsers } from "../mocks/data";

const wait = (data, delay = 350) => new Promise((resolve) => setTimeout(() => resolve(data), delay));
const authMode = import.meta.env.VITE_AUTH_MODE || "mock";

function normalizeSession(payload) {
  const session = payload?.data?.token ? payload.data : payload;
  if (!session?.token || !session?.user) throw new Error("El servidor no devolvió una sesión válida.");
  return { token: session.token, user: session.user };
}

export const authService = {
  async login({ email, password }) {
    const normalizedEmail = email?.trim().toLowerCase();
    if (authMode === "api") {
      const response = await client.post("/auth/login", { email: normalizedEmail, password });
      return normalizeSession(response.data);
    }
    const user = mockUsers.find((item) => item.email.toLowerCase() === normalizedEmail);
    if (!user) throw new Error("No encontramos una cuenta asociada a ese correo.");
    return wait({ token: `mock-jwt-${user.id}`, user });
  },
  async requestPasswordReset(email) {
    if (authMode === "api") return client.post("/auth/forgot-password", { email: email.trim().toLowerCase() });
    return wait({ success: true, message: "Si el correo existe, recibirás instrucciones." }, 500);
  },
  async logout() {
    if (authMode === "api") { try { await client.post("/auth/logout"); } catch { /* La sesión local también debe cerrarse. */ } }
    return wait({ success: true }, 150);
  },
};
