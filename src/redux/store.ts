import { configureStore } from "@reduxjs/toolkit";
import { counterReducer } from "./store/utils";
import pushMessages from "./store/pushMessage";

export const store = configureStore({
  reducer: {
    utils: counterReducer,
    pushMessages: pushMessages,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
