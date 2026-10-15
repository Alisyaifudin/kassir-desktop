import { Effect, Layer, Stream, SubscriptionRef } from "effect";
import { InfoError, InfoService, type Info } from ".";
import { StoreService } from "../store";

const KEY = {
  name: "name",
  owner: "owner",
  address: "address",
  footer: "footer",
  header: "header",
  showCashier: "show-cashier",
} as const;

const DEFAULT_INFO: Info = {
  name: "Toko",
  owner: "",
  address: "",
  footer: "",
  header: "",
  showCashier: false,
};

function toText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function toBool(value: unknown): boolean {
  return value === true || value === "true";
}

export const InfoLive = Layer.effect(
  InfoService,
  Effect.gen(function* () {
    const store = yield* StoreService;

    // Single source of truth; the first read/subscribe hydrates from the store.
    const infoRef = yield* SubscriptionRef.make<Info>(DEFAULT_INFO);
    let loaded = false;

    function readField(key: string): Effect.Effect<unknown, InfoError> {
      return store.get<unknown>(key).pipe(
        Effect.catchTag("NotFound", () => Effect.succeed(undefined)),
        Effect.catchTag("StoreError", (error) =>
          Effect.fail(new InfoError({ message: error.message })),
        ),
      );
    }

    function writeField(key: string, value: unknown): Effect.Effect<void, InfoError> {
      return store
        .set(key, value)
        .pipe(Effect.mapError((error) => new InfoError({ message: error.message })));
    }

    function load(): Effect.Effect<Info, InfoError> {
      return Effect.gen(function* () {
        const [name, owner, address, footer, header, showCashier] = yield* Effect.all([
          readField(KEY.name),
          readField(KEY.owner),
          readField(KEY.address),
          readField(KEY.footer),
          readField(KEY.header),
          readField(KEY.showCashier),
        ]);
        return {
          name: toText(name, "Toko"),
          owner: toText(owner),
          address: toText(address),
          footer: toText(footer),
          header: toText(header),
          showCashier: toBool(showCashier),
        };
      });
    }

    function hydrate(): Effect.Effect<void, InfoError> {
      return Effect.gen(function* () {
        const info = yield* load();
        yield* SubscriptionRef.set(infoRef, info);
        loaded = true;
      });
    }

    function ensureLoaded(): Effect.Effect<void, InfoError> {
      return Effect.gen(function* () {
        if (loaded) return;
        yield* hydrate();
      });
    }

    return {
      name: () =>
        ensureLoaded().pipe(
          Effect.zipRight(SubscriptionRef.get(infoRef)),
          Effect.map((info) => info.name),
        ),
      info: () => ensureLoaded().pipe(Effect.zipRight(SubscriptionRef.get(infoRef))),
      set: (info) =>
        Effect.gen(function* () {
          yield* Effect.all([
            writeField(KEY.name, info.name),
            writeField(KEY.owner, info.owner),
            writeField(KEY.address, info.address),
            writeField(KEY.footer, info.footer),
            writeField(KEY.header, info.header),
            writeField(KEY.showCashier, info.showCashier),
          ]);
          yield* SubscriptionRef.set(infoRef, info);
          loaded = true;
        }),
      refresh: () => hydrate(),
      changes: Stream.unwrap(ensureLoaded().pipe(Effect.as(infoRef.changes))),
    };
  }),
);
