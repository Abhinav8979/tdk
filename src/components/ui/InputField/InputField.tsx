"use client";

import { InputFieldProps } from "@/types/ui.types";
import clsx from "clsx";
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function InputField({
  name,
  type = "text",
  placeholder,
  icon,
  error,
  register,
  showPassword,
  setShowPassword,
  rightElement,
}: InputFieldProps) {
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <div className="relative">
      {error && (
        <p className="text-red-500 text-sm my-1 ml-2">{error.message}</p>
      )}
      {icon && (
        <span
          className={clsx(
            "absolute top-1/2 left-4 transform text-[var(--primary-background)] pointer-events-none",
            error ? "translate-y-1/4" : "-translate-y-1/2"
          )}
        >
          {icon}
        </span>
      )}
      <input
        type={inputType}
        placeholder={placeholder}
        {...register}
        className={clsx(
          "w-full py-3 pr-12 border border-gray-300 rounded-xl bg-gray-50 text-base focus:outline-none focus:ring-2 transition placeholder-gray-400",
          icon ? "pl-12" : "pl-4",
          "focus:ring-[var(--primary-background)]"
        )}
      />
      {isPassword && setShowPassword && (
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className={clsx(
            "absolute right-4 transform transition text-gray-400 hover:text-[var(--primary-background)]",
            error ? "translate-y-[70%]" : "top-1/2 -translate-y-1/2"
          )}
        >
          {showPassword ? (
            <FiEyeOff className="cursor-pointer" size={20} />
          ) : (
            <FiEye className="cursor-pointer" size={20} />
          )}
        </button>
      )}
      {rightElement && !isPassword && (
        <div className="absolute top-1/2 right-4 transform -translate-y-1/2">
          {rightElement}
        </div>
      )}
    </div>
  );
}
