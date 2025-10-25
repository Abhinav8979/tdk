import SecondaryLoader from "@/components/loader/SecondaryLoader";
import clsx from "clsx";
import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "danger" | "none";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  isLoading?: boolean;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  leftIcon,
  rightIcon,
  isLoading = false,
  disabled,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center scale-95 md:scale-100  font-semibold rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed";

  // ✅ Responsive font & padding
  const sizeStyles = {
    sm: "text-sm px-4 py-2",
    md: "text-base px-5 py-2.5",
    lg: "text-lg px-6 py-3",
  };

  const variantStyles = {
    primary:
      "bg-[var(--primary-background)] hover:brightness-90 text-white cursor-pointer px-4 py-2 sm:px-6 sm:py-2.5 text-sm sm:text-base rounded-lg transition-all duration-200",
    secondary:
      "bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300 shadow-sm cursor-pointer px-4 py-2 sm:px-6 sm:py-2.5 text-sm sm:text-base rounded-lg transition-all duration-200",
    outline:
      "bg-transparent text-[var(--primary-background)] border border-[var(--primary-background)] hover:bg-[var(--primary-background)] hover:text-white cursor-pointer px-4 py-2 sm:px-6 sm:py-2.5 text-sm sm:text-base rounded-lg transition-all duration-200",
    danger:
      "bg-red-500 text-white hover:bg-red-600 shadow-sm cursor-pointer px-4 py-2 sm:px-6 sm:py-2.5 text-sm sm:text-base rounded-lg transition-all duration-200",
    none: "cursor-pointer px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg transition-all duration-200",
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={clsx(
        variant !== "none" && baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        {
          "w-full": fullWidth,
          "opacity-60": disabled || isLoading,
        },
        className
      )}
      // type={type}
      {...props}
    >
      {isLoading ? (
        <SecondaryLoader />
      ) : (
        <>
          {leftIcon && (
            <span className="mr-2 text-base sm:text-xs">{leftIcon}</span>
          )}
          <span>{children}</span>
          {rightIcon && (
            <span className="ml-2 text-base sm:text-xs">{rightIcon}</span>
          )}
        </>
      )}
    </button>
  );
}
