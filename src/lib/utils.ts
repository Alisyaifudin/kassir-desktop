import { z } from "zod";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * A non-empty string that reads as a finite number.
 *
 * The "must be a number" rule is a conjunction, not a disjunction: with `||`
 * every non-empty string passed and `integer.parse("abc")` produced `NaN`,
 * so the five URL parsers built on these helpers believed a malformed `?page=`
 * had already been rejected. The empty string is rejected too — it is "no
 * value", not zero; a caller that wants zero says so.
 */
export const numerish = z
  .string()
  .trim()
  .min(1, { message: "Harus angka" })
  .refine((val) => Number.isFinite(Number(val)), { message: "Harus angka" });

export const numeric = numerish.transform((val) => Number(val));

export const integer = z
  .string()
  .trim()
  .min(1, { message: "Harus angka bulat" })
  .refine((val) => Number.isSafeInteger(Number(val)), { message: "Harus angka bulat" })
  .transform((v) => Number(v));


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * The one parse of `?url_back=`.
 *
 * A `url_back` is an in-app path the caller returns to, so only a rooted,
 * non-protocol-relative value is accepted: `//evil.com` and `https://evil.com`
 * fall back to the caller's default. Under the hash router neither is an open
 * redirect today, but every reader used to validate with a bare `z.string()`
 * (or not at all), so the rule belongs in one place before a future `<a href>`
 * or `window.location` use turns one of them into a real redirect.
 */
export function urlBackOf(search: URLSearchParams): string | null {
  const parsed = z
    .string()
    .refine((value) => value.startsWith("/") && !value.startsWith("//"), {
      message: "Bukan alamat di dalam aplikasi",
    })
    .safeParse(search.get("url_back"));
  return parsed.success ? parsed.data : null;
}

export function getURLBack(defaultURL: string, search: URLSearchParams) {
  return urlBackOf(search) ?? defaultURL;
}

/**
 * Title-case a display name.
 *
 * Total on purpose: names reach this from forms, the backup import path and
 * legacy rows, so a double space or an empty string must render (as invented
 * here: extra spaces collapse, nothing throws). The previous version split on a
 * single space and upper-cased `t[0]`, so `capitalize("Budi  Santoso")` — or an
 * imported `cashier: ""` — threw a TypeError in the middle of a render and took
 * down the login picker, the day list and the receipt.
 */
export function capitalize(name: string): string {
  return name
    .split(/\s+/)
    .filter((term) => term !== "")
    .map((term) => term[0].toUpperCase() + term.slice(1))
    .join(" ");
}

export function formatError(e: unknown): string {
  if (typeof e === "string") return e;
  else if (e instanceof Error) return e.message;
  console.error(e);
  return "Error tidak dikenal";
}
