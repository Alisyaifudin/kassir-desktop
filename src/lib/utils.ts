import { z } from "zod";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import * as logTauri from "@tauri-apps/plugin-log";

import { LoaderFunction, LoaderFunctionArgs } from "react-router";
export const log = logTauri;

export const numerish = z.string().refine((val) => val !== "" || !isNaN(Number(val)), {
  message: "Harus angka",
});

export const numeric = numerish.transform((val) => Number(val));

export const integer = z
  .string()
  .refine((val) => val !== "" || !isNaN(Number(val)) || !Number.isInteger(Number(val)), {
    message: "Harus angka bulat",
  })
  .transform((v) => Number(v));

export type Result<E, T> = [E, null] | [null, T];

export function err<T>(value: T): [T, null] {
  return [value, null];
}

export function ok<T>(value: T): [null, T] {
  return [null, value];
}

// First, define the default message type and value
export const DEFAULT_ERROR = "Aplikasi bermasalah" as const;
export type DefaultError = typeof DEFAULT_ERROR;
export const NOT_FOUND = "Tidak ditemukan" as const;
export type NotFound = typeof NOT_FOUND;

// Modified function with default type parameter
export async function tryResult<R, const T = DefaultError>({
  run,
  message = DEFAULT_ERROR as T,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run: (...arg: any[]) => Promise<R>;
  message?: T;
}): Promise<Result<T, R>> {
  try {
    return ok(await run());
  } catch (error) {
    log.error(JSON.stringify(error));
    return err(message);
  }
}

export function safeJSON(v: string): Result<"Gagal parse json", any> {
  try {
    const parsed = JSON.parse(v);
    return ok(parsed);
  } catch (error) {
    log.error(JSON.stringify(error));
    return err("Gagal parse json");
  }
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function boolToNum(v: boolean): 0 | 1 {
  return v ? 1 : 0;
}

export function lazyLoader(importer: () => Promise<{ loader: LoaderFunction }>): LoaderFunction {
  return async (args: LoaderFunctionArgs) => {
    const { loader } = await importer();
    return loader(args);
  };
}

export function constructCSV<T extends Record<string, any>>(data: T[]): string {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0]) as (keyof T)[];
  const delimiter = ";";
  const lineBreak = "\n";

  // Escape CSV special characters (commas, quotes, newlines)
  const escapeCSV = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes(delimiter) || str.includes('"') || str.includes(lineBreak)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines: string[] = [];

  // Add header row
  lines.push(headers.map((header) => escapeCSV(header)).join(delimiter));

  // Add data rows
  for (const item of data) {
    const row = headers.map((header) => escapeCSV(item[header]));
    lines.push(row.join(delimiter));
  }

  return lines.join(lineBreak);
}

export function getBackURL(defaultURL: string, search: URLSearchParams) {
  const parsed = z.string().safeParse(search.get("url_back"));
  const urlBack = parsed.success ? parsed.data : defaultURL;
  return urlBack;
}

export function capitalize(name: string): string {
  const terms = name.split(" ");
  return terms.map((t) => t[0].toUpperCase() + t.slice(1)).join(" ");
}

export const sizeClass = {
  big: "",
  small: "small-size",
} as const;

export function formatBarcode(barcode?: string) {
  if (barcode === undefined) return "";
  const chunks = chunkSubstr(barcode, 14);
  return chunks.join("\n");
}

function chunkSubstr(str: string, size: number): string[] {
  const numChunks = Math.ceil(str.length / size);
  const chunks: string[] = new Array(numChunks);

  for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
    chunks[i] = str.substring(o, size + o);
  }

  return chunks;
}

export function isString(v: unknown): v is string {
  return typeof v === "string";
}
