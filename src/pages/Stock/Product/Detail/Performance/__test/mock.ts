import { Effect } from "effect";
import { Temporal } from "temporal-polyfill";
import { ProductService } from "~/services/product";
import { ProductError } from "~/services/product/error";
import type { HistoryEvent } from "~/services/product/type";
import { ConfigService } from "~/services/config";
import { DateService } from "~/services/date";
import type { Size } from "~/services/config";

// ---------------------------------------------------------------------------
// Default fixtures
// ---------------------------------------------------------------------------

export const defaultEvents: HistoryEvent[] = [
  { id: "1", timestamp: Date.UTC(2025, 5, 1), note: "Penjualan", value: 5 },
  { id: "2", timestamp: Date.UTC(2025, 5, 2), note: "Penjualan", value: 3 },
  { id: "3", timestamp: Date.UTC(2025, 5, 3), note: "Pembelian", value: -10 },
  { id: "4", timestamp: Date.UTC(2025, 5, 15), note: "Penjualan", value: 8 },
  { id: "5", timestamp: Date.UTC(2025, 5, 28), note: "Penjualan", value: 2 },
];

// ---------------------------------------------------------------------------
// Mock service factories — plain objects, no reactive state
// ---------------------------------------------------------------------------

export function makeProductService(opts?: {
  loader?: () => Effect.Effect<HistoryEvent[], ProductError>;
  events?: HistoryEvent[];
  eventsError?: string;
}): typeof ProductService.Service {
  const eventsLoader = opts?.loader ?? (() => {
    if (opts?.eventsError) {
      return Effect.fail(new ProductError(new Error(opts.eventsError)));
    }
    return Effect.succeed(opts?.events ?? defaultEvents);
  });
  return {
    get: {
      all: () => Effect.succeed([]),
      byId: () => Effect.fail(new ProductError(new Error("not implemented"))),
      events: () => eventsLoader(),
    },
    add: {
      new: () => Effect.void,
      external: () => Promise.resolve(null),
    },
    update: {
      info: () => Effect.void,
    },
    delete: () => Effect.void,
  };
}

export function makeDateService(opts?: {
  now?: number;
  todayPlainDate?: Temporal.PlainDate;
  timeZoneId?: string;
}): typeof DateService.Service {
  return {
    now: () => opts?.now ?? Date.now(),
    todayDate: () => opts?.todayPlainDate ?? Temporal.Now.plainDateISO(),
    timeZoneId: () => opts?.timeZoneId ?? Temporal.Now.timeZoneId(),
    today: {
      str: () => "2025-01-01",
    },
  };
}

export function makeConfigService(opts?: {
  size?: Size;
}): typeof ConfigService.Service {
  return {
    size: {
      useSize: () => opts?.size ?? "big",
      set: () => {},
    },
    theme: {
      useTheme: () => "light",
      set: () => {},
    },
  };
}
