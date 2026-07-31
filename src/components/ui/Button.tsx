import { cn } from "@/utils/cn";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary: "bg-[#4C72AA] hover:bg-[#3a5a8f] text-white",
  ghost: "bg-transparent hover:bg-[#4C72AA]/10 text-[#4C72AA]",
  danger: "bg-red-500 hover:bg-red-600 text-white",
};

export const Button = ({
  variant = "primary",
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) => (
  <button
    disabled={disabled || loading}
    className={cn(
      "px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
      variants[variant],
      className,
    )}
    {...props}
  >
    {loading ? <span className="loading loading-spinner loading-xs" /> : children}
  </button>
);
