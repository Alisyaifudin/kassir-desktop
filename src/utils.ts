import { z } from "zod";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Temporal } from "temporal-polyfill";

export const numerish = z.string().refine((val) => !isNaN(Number(val)), {
	message: "Harus angka",
});

export const numeric = numerish.transform((val) => Number(val));

export type Result<E, T> = [E, null] | [null, T];

export function err<T>(value: T): [T, null] {
	return [value, null];
}

export function ok<T>(value: T): [null, T] {
	return [null, value];
}

// First, define the default message type and value
const DEFAULT_MESSAGE = "Server bermasalah" as const;
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
		console.error(error);
		return err(message);
	}
}

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const monthNames = {
	0: "Januari",
	1: "Februari",
	2: "Maret",
	3: "April",
	4: "Mei",
	5: "Juni",
	6: "Juli",
	7: "Agustus",
	8: "September",
	9: "Oktober",
	10: "November",
	11: "Desember",
} as Record<number, string>;

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

export function formatTime(epochMilli: number): string {
	const tz = Temporal.Now.timeZoneId();
	const date = Temporal.Instant.fromEpochMilliseconds(epochMilli).toZonedDateTimeISO(tz);
	const { hour, minute } = date;
	return `${hour}:${minute.toString().padStart(2, "0")}`;
}
