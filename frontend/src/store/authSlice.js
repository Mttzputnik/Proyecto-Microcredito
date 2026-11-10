import { createSlice } from "@reduxjs/toolkit";

const SESSION_KEY = "microcredito-session";
const stored = sessionStorage.getItem(SESSION_KEY);
const initialSession = stored ? JSON.parse(stored) : null;

const authSlice = createSlice({
  name: "auth",
  initialState: { user: initialSession?.user || null, token: initialSession?.token || null },
  reducers: {
    setSession: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(action.payload));
    },
    clearSession: (state) => {
      state.user = null;
      state.token = null;
      sessionStorage.removeItem(SESSION_KEY);
    },
  },
});

export const { setSession, clearSession } = authSlice.actions;
export default authSlice.reducer;
