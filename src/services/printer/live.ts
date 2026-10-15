import { Effect, Layer, Stream, SubscriptionRef } from "effect";
import { PrinterError, PrinterService, type Printer } from ".";
import { StoreService } from "../store";

const KEY = {
  name: "printer_name",
  width: "printer_width",
} as const;

const DEFAULT_PRINTER: Printer = {
  name: "",
  width: 80,
};

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toWidth(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 80;
}

export const PrinterLive = Layer.effect(
  PrinterService,
  Effect.gen(function* () {
    const store = yield* StoreService;

    // Single source of truth; the first read/subscribe hydrates from the store.
    const printerRef = yield* SubscriptionRef.make<Printer>(DEFAULT_PRINTER);
    let loaded = false;

    function readField(key: string): Effect.Effect<unknown, PrinterError> {
      return store.get<unknown>(key).pipe(
        Effect.catchTag("NotFound", () => Effect.succeed(undefined)),
        Effect.catchTag("StoreError", (error) =>
          Effect.fail(new PrinterError({ message: error.message })),
        ),
      );
    }

    function writeField(key: string, value: unknown): Effect.Effect<void, PrinterError> {
      return store
        .set(key, value)
        .pipe(Effect.mapError((error) => new PrinterError({ message: error.message })));
    }

    function load(): Effect.Effect<Printer, PrinterError> {
      return Effect.gen(function* () {
        const [name, width] = yield* Effect.all([readField(KEY.name), readField(KEY.width)]);
        return { name: toText(name), width: toWidth(width) };
      });
    }

    function hydrate(): Effect.Effect<void, PrinterError> {
      return Effect.gen(function* () {
        const printer = yield* load();
        yield* SubscriptionRef.set(printerRef, printer);
        loaded = true;
      });
    }

    function ensureLoaded(): Effect.Effect<void, PrinterError> {
      return Effect.gen(function* () {
        if (loaded) return;
        yield* hydrate();
      });
    }

    return {
      get: () => ensureLoaded().pipe(Effect.zipRight(SubscriptionRef.get(printerRef))),
      set: (printer) =>
        Effect.gen(function* () {
          yield* Effect.all([
            writeField(KEY.name, printer.name),
            writeField(KEY.width, printer.width),
          ]);
          yield* SubscriptionRef.set(printerRef, printer);
          loaded = true;
        }),
      changes: Stream.unwrap(ensureLoaded().pipe(Effect.as(printerRef.changes))),
    };
  }),
);
