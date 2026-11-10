import { createSlice } from "@reduxjs/toolkit";

const uiSlice = createSlice({
  name: "ui",
  initialState: { siderCollapsed: false, notice: null },
  reducers: {
    toggleSider: (state) => { state.siderCollapsed = !state.siderCollapsed; },
    setNotice: (state, action) => { state.notice = action.payload; },
    clearNotice: (state) => { state.notice = null; },
  },
});

export const { toggleSider, setNotice, clearNotice } = uiSlice.actions;
export default uiSlice.reducer;
