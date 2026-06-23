import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names, de-duplicating conflicting utilities. */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
