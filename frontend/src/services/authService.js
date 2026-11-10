import { mockUsers } from "../mocks/data";

const wait = (data, delay = 350) => new Promise((resolve) => setTimeout(() => resolve(data), delay));

export const authService = {
  async login({ email, role }) {
    const user = mockUsers.find((item) => item.email === email && item.role === role) || mockUsers.find((item) => item.role === role);
    if (!user) throw new Error("No encontramos un usuario con ese rol.");
    return wait({ token: `mock-jwt-${user.id}`, user });
  },
  async logout() { return wait({ success: true }, 150); },
};
