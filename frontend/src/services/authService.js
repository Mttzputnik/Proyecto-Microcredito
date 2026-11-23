import client from "../api/client";
import { mockUsers } from "../mocks/data";

const wait = (data, delay = 350) => new Promise((resolve) => setTimeout(() => resolve(data), delay));
const authMode = import.meta.env.VITE_AUTH_MODE || "api";
const backendRoleLabels = {
  ADMIN: "Administrador técnico",
  CREDIT_OFFICER: "Oficial de crédito",
  analista_riesgo: "Analista de riesgo",
  administrativo: "Área administrativa",
  comite_supervisor: "Comité supervisor",
  AUDITOR: "Auditor (rol legado sin permisos operativos)",
};

function normalizeUser(user) {
  if (!user) return user;
  return { ...user, name: user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim(), roleLabel: user.roleLabel || backendRoleLabels[user.role] || user.role };
}
function normalizeSession(payload) {
  const session = payload?.data?.token ? payload.data : payload;
  if (!session?.token || !session?.user) throw new Error("El servidor no devolvió una sesión válida.");
  return { token: session.token, user: normalizeUser(session.user) };
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
    return wait({ token: `mock-jwt-${user.id}`, user: normalizeUser(user) });
  },
  async getCurrentUser() {
    const response = await client.get("/auth/me");
    return normalizeUser(response.data?.data || response.data?.user);
  },
  async requestPasswordReset(email) {
    if (authMode === "api") return client.post("/auth/forgot-password", { email: email.trim().toLowerCase() });
    return wait({ success: true, message: "Si el correo existe, recibirás instrucciones." }, 500);
  },
  async logout() {
    // JWT stateless: el cierre de sesión se realiza eliminando la sesión local.
    return wait({ success: true }, 150);
  },
};
