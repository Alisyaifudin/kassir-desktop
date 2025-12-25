import Decimal from "decimal.js";
import { Temporal } from "temporal-polyfill";
import { Record } from "~/database/record/get-by-range";

function getEdges(
  interval: "day" | "week" | "month" | "year",
  start: number,
  end: number
): { edges: number[]; labels: string[] } {
  const tz = Temporal.Now.timeZoneId();
  let date = Temporal.Instant.fromEpochMilliseconds(start).toZonedDateTimeISO(tz);
  switch (interval) {
    case "day": {
      const edges = genEdges(start, end, 24);
      const labels = Array.from({ length: 24 }).map((_, i) => String(i));
      return { edges, labels };
    }
    case "week": {
      const edges = genEdges(start, end, date.daysInWeek);
      const labels = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
      return { edges, labels };
    }
    case "month": {
      const edges = genEdges(start, end, date.daysInMonth);
      const labels = Array.from({ length: date.daysInMonth }).map((_, i) => String(i + 1));
      return { edges, labels };
    }
    case "year":
      const edges: number[] = [start];
      for (let i = 0; i < 12; i++) {
        date = date.add(Temporal.Duration.from({ months: 1 }));
        edges.push(date.epochMilliseconds);
      }
      const labels = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "Mei",
        "Juni",
        "Juli",
        "Agu",
        "Sep",
        "Okt",
        "Nov",
        "Des",
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
  records: Record[];
  interval: "week" | "month" | "year";
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
      const grandTotal = Number(
        new Decimal(record.total).plus(record.rounding).toFixed(record.fix)
      );
      if (record.mode === "sell") {
        revenues[currentInterval] += grandTotal;
      } else {
        spendings[currentInterval] += grandTotal;
        if (record.isCredit) {
          debts[currentInterval] += grandTotal;
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
  records: Record[];
  interval: "day" | "week";
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
      if (record.mode === "sell") {
        visitors[currentInterval] += 1;
      }
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
