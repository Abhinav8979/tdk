import { utilsState } from "@/types/reduxUtils.type";
import { createSlice } from "@reduxjs/toolkit";

const initialState: utilsState = {
  toastMessage: null,
  loading: false,
  modalOpen: false,
};

const utilsSlice = createSlice({
  name: "utils",
  initialState,
  reducers: {
    setToastMessage: (state, action) => {
      state.toastMessage = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    toggleModalOpen: (state) => {
      state.modalOpen = !state.modalOpen;
    },
  },
});

export const { setLoading, setToastMessage, toggleModalOpen } =
  utilsSlice.actions;

export const counterReducer = utilsSlice.reducer;
