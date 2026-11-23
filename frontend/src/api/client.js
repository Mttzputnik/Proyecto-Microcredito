import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
});

client.interceptors.request.use((config) => {
  const rawSession = sessionStorage.getItem("microcredito-session");
  const session = rawSession ? JSON.parse(rawSession) : null;
  if (session?.token) config.headers.Authorization = `Bearer ${session.token}`;
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent("microcredito:unauthorized"));
    }
    return Promise.reject(error);
  },
);

export default client;
