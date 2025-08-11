import { z } from "zod";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Temporal } from "temporal-polyfill";
import * as logTauri from "@tauri-apps/plugin-log";

export const version = "3.3.2";

export const METHODS = ["cash", "transfer", "debit", "qris"] as const;
export const METHOD_NAMES = {
	cash: "Tunai",
	transfer: "Transfer",
	debit: "Debit",
	qris: "QRIS",
} as const;

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
const DEFAULT_MESSAGE = "Aplikasi bermasalah" as const;
type DefaultMessage = typeof DEFAULT_MESSAGE;

// Modified function with default type parameter
export async function tryResult<R, const T = DefaultMessage>({
	run,
	message = DEFAULT_MESSAGE as T,
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

export const monthNames = {
	1: "Januari",
	2: "Februari",
	3: "Maret",
	4: "April",
	5: "Mei",
	6: "Juni",
	7: "Juli",
	8: "Agustus",
	9: "September",
	10: "Oktober",
	11: "November",
	12: "Desember",
} as Record<number, string>;

export const dayNames = {
	1: "Senin",
	2: "Selasa",
	3: "Rabu",
	4: "Kamis",
	5: "Jumat",
	6: "Sabtu",
	7: "Minggu",
} as Record<number, string>;

export function getDayName(epochMilli: number) {
	const tz = Temporal.Now.timeZoneId();
	const date = Temporal.Instant.fromEpochMilliseconds(epochMilli).toZonedDateTimeISO(tz);
	return dayNames[date.dayOfWeek];
}

export function formatDate(epochMilli: number, type: "short" | "long" = "short"): string {
	const tz = Temporal.Now.timeZoneId();
	const date = Temporal.Instant.fromEpochMilliseconds(epochMilli).toZonedDateTimeISO(tz);
	const { day, month, year } = date;
	switch (type) {
		case "short":
			return `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
		case "long":
			return `${day} ${monthNames[month]} ${year}`;
	}
}

export const dateStringSchema = z.string().regex(
	/^\d+-\d{2}-\d{2}$/, // Regular expression to match any number of digits for the year, followed by MM-DD
	"Tanggal tidak valid"
);

export function formatTime(epochMilli: number, format: "long" | "short" = "short"): string {
	const tz = Temporal.Now.timeZoneId();
	const date = Temporal.Instant.fromEpochMilliseconds(epochMilli).toZonedDateTimeISO(tz);
	const { hour, minute, second } = date;
	switch (format) {
		case "long":
			return `${hour}:${minute.toString().padStart(2, "0")}:${second.toString().padStart(2, "0")}`;
		case "short":
			return `${hour}:${minute.toString().padStart(2, "0")}`;
	}
}

export function dateToEpoch(date: string): number {
	const [year, month, day] = date.split("-").map(Number);
	const tz = Temporal.Now.timeZoneId();
	const t = Temporal.ZonedDateTime.from({ timeZone: tz, year, month, day }).startOfDay()
		.epochMilliseconds;
	return t;
}

export function getDayOrder(epochMilli: number) {
	const tz = Temporal.Now.timeZoneId();
	const date = Temporal.Instant.fromEpochMilliseconds(epochMilli).toZonedDateTimeISO(tz);
	return date.day;
}

export function constructCSV<T extends Record<string, any>>(data: T[]): string {
	if (data.length === 0) return "";

	const headers = Object.keys(data[0]) as (keyof T)[];
	const delimiter = ",";
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
