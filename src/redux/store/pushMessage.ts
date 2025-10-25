// store/slices/pushMessageSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface PushMessage {
  id: string;
  type: string;
  message: string;
  expiryTime: string;
  userId: string;
  storeId?: string;
  createdById: string;
  recipientType: "INDIVIDUAL" | "STORE";
}

interface State {
  messages: PushMessage[];
}

const initialState: State = {
  messages: [],
};

const pushMessageSlice = createSlice({
  name: "pushMessages",
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<PushMessage>) => {
      state.messages.push(action.payload);
    },
  },
});

export const { addMessage } = pushMessageSlice.actions;
export default pushMessageSlice.reducer;
