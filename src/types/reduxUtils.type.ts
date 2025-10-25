type toastMessage = {
  type: "error" | "success" | "info" | "warning";
  message: string;
};

export interface utilsState {
  toastMessage: toastMessage | null;
  loading: boolean;
  modalOpen:boolean
}
