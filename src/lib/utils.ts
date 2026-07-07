import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import z from "zod";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function boolToNum(v: boolean): 0 | 1 {
  return v ? 1 : 0;
}

export function isString(v: unknown): v is string {
  return typeof v === "string";
}

export const integer = z
  .string()
  .transform((v) => Number(v))
  .refine((v) => !isNaN(v), "Harus angka")
  .refine((v) => isFinite(v), "Harus angka")
  .refine((v) => Number.isInteger(v), "Harus bulat");
