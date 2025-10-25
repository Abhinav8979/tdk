import { FieldError, UseFormRegisterReturn } from "react-hook-form";

export type InputFieldProps = {
  name: string;
  type?: string;
  placeholder?: string;
  icon?: React.ReactNode;
  error?: FieldError;
  register: UseFormRegisterReturn;
  showPassword?: boolean;
  setShowPassword?: React.Dispatch<React.SetStateAction<boolean>>;
  rightElement?: React.ReactNode;
};
