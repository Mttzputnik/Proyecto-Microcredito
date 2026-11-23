import { createSlice } from "@reduxjs/toolkit";

export const SESSION_KEY = "microcredito-session";

function readStoredSession() {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed?.token && parsed?.user ? parsed : null;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

const initialSession = readStoredSession();

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: initialSession?.user || null,
    token: initialSession?.token || null,
    status: initialSession?.token ? "loading" : "unauthenticated",
  },
  reducers: {
    setSession: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.status = "authenticated";
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(action.payload));
    },
    setCurrentUser: (state, action) => {
      state.user = action.payload;
      state.status = "authenticated";
      const stored = readStoredSession();
      if (stored?.token) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token: stored.token, user: action.payload }));
      }
    },
    setAuthStatus: (state, action) => {
      state.status = action.payload;
    },
    clearSession: (state) => {
      state.user = null;
      state.token = null;
      state.status = "unauthenticated";
      sessionStorage.removeItem(SESSION_KEY);
    },
  },
});

export const { setSession, setCurrentUser, setAuthStatus, clearSession } = authSlice.actions;
export default authSlice.reducer;
