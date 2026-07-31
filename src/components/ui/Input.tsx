import { cn } from "@/utils/cn";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = ({ error, label, id, className, ...props }: InputProps) => (
  <div className="flex flex-col space-y-1">
    {label && <label htmlFor={id} className="text-sm">{label}</label>}
    <input
      id={id}
      className={cn(
        "input input-bordered focus:outline-none focus:border-[#4C72AA] w-full",
        error && "border-error",
        className,
      )}
      {...props}
    />
    {error && <span className="text-error text-xs">{error}</span>}
  </div>
);
