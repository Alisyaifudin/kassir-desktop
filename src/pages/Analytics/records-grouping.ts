import { Temporal } from "temporal-polyfill";

function getEdges(
	interval: "daily" | "weekly" | "monthly" | "yearly",
	start: number,
	end: number
): { edges: number[]; labels: string[] } {
	const tz = Temporal.Now.timeZoneId();
	let date = Temporal.Instant.fromEpochMilliseconds(start).toZonedDateTimeISO(tz);
	switch (interval) {
		case "daily": {
			const edges = genEdges(start, end, 24);
			const labels = Array.from({ length: 24 }).map((_, i) => String(i + 1));
			return { edges, labels };
		}
		case "weekly": {
			const edges = genEdges(start, end, date.daysInWeek);
			const labels = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
			return { edges, labels };
		}
		case "monthly": {
			const edges = genEdges(start, end, date.daysInMonth);
			const labels = Array.from({ length: date.daysInMonth }).map((_, i) => String(i + 1));
			return { edges, labels };
		}
		case "yearly":
			const edges: number[] = [start];
			for (let i = 0; i < 12; i++) {
				date = date.add(Temporal.Duration.from({ months: 1 }));
				edges.push(date.epochMilliseconds);
			}
			const labels = [
				"Januari",
				"Februari",
				"Maret",
				"April",
				"Mei",
				"Juni",
				"Juli",
				"Agustus",
				"September",
				"Oktober",
				"November",
				"Desember",
			];
			return { edges, labels };
	}
}

function genEdges(start: number, end: number, bin: number): number[] {
	const edges: number[] = [start];
	let last = start;
	const range = end - start;
	const delta = range / bin;
	for (let i = 1; i <= bin; i++) {
		edges.push(last + delta);
		last += delta;
	}
	return edges;
}

export function getFlow({
	records,
	interval,
	start,
	end,
}: {
	records: DB.Record[];
	interval: "weekly" | "monthly" | "yearly";
	start: number;
	end: number;
}) {
	const { edges, labels } = getEdges(interval, start, end);
	const revenues: number[] = new Array(edges.length - 1).fill(0);
	const spendings: number[] = new Array(edges.length - 1).fill(0);
	const debts: number[] = new Array(edges.length - 1).fill(0);
	let currentInterval = 0;
	let recordIndex = 0;
	while (currentInterval < edges.length - 1 && recordIndex < records.length) {
		const intervalStart = edges[currentInterval];
		const intervalEnd = edges[currentInterval + 1];
		const record = records[recordIndex];
		if (record.timestamp < intervalStart) {
			// Record is before current interval, skip it
			recordIndex++;
		} else if (record.timestamp > intervalEnd) {
			// Record is after current interval, move to next interval
			currentInterval++;
		} else {
			// Record belongs to current interval
			if (record.mode === "sell") {
				revenues[currentInterval] += record.grand_total;
			} else {
				spendings[currentInterval] += record.grand_total;
				if (record.credit) {
					debts[currentInterval] += record.grand_total;
				}
			}
			recordIndex++;
		}
	}
	return { revenues, spendings, labels, debts };
}

export function getVisitors({
	records,
	start,
	end,
	interval,
}: {
	records: DB.Record[];
	interval: "daily" | "weekly";
	start: number;
	end: number;
}) {
	const { edges, labels } = getEdges(interval, start, end);
	const visitors: number[] = new Array(edges.length - 1).fill(0);
	let currentInterval = 0;
	let recordIndex = 0;
	while (currentInterval < edges.length - 1 && recordIndex < records.length) {
		const intervalStart = edges[currentInterval];
		const intervalEnd = edges[currentInterval + 1];
		const record = records[recordIndex];
		if (record.timestamp < intervalStart) {
			// Record is before current interval, skip it
			recordIndex++;
		} else if (record.timestamp > intervalEnd) {
			// Record is after current interval, move to next interval
			currentInterval++;
		} else {
			// Record belongs to current interval
			visitors[currentInterval] += 1;
			recordIndex++;
		}
	}

	return { visitors, labels };
}

export function getTicks(max: number): number[] {
	if (max <= 2) {
		return [1];
	}
	const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
	let interval = magnitude;
	if (max < 2 * magnitude) {
		interval = magnitude / 2;
	} else if (max < 5 * magnitude) {
		interval = magnitude;
	} else {
		interval = magnitude * 2;
	}
	const ticks: number[] = [];
	for (let tick = interval; tick < max; tick += interval) {
		ticks.push(tick);
	}

	return ticks;
}
