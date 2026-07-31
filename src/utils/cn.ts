//conditionally join class names
import { clsx, type ClassValue } from "clsx";
//merge conflicting tailwind classes based specificity
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
