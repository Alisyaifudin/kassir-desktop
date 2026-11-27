import { Effect, Layer, Ref } from "effect";
import equal from "fast-deep-equal";
import { ScrollError, ScrollService, type ScrollAnchor, type ScrollContainer } from ".";
import { LocalStorageService } from "../local-storage";
import { log } from "~/lib/log";

/** What a list reads before it has ever been scrolled. */
const EMPTY: ScrollAnchor = {
  records: { day: null, values: {} },
  products: { key: "", view: "", id: null, top: 0 },
  cart: { positions: {} },
  analytics: { positions: {} },
  ledger: { positions: {} },
};

/**
 * One localStorage key per container rather than one shared document: a write
 * stays small, and a value that no longer parses can only cost that one list its
 * position.
 */
function keyOf(container: ScrollContainer): string {
  return `scroll-${container}`;
}

/**
 * A stored anchor, or nothing. localStorage outlives app versions, so anything an
 * entry may hold — a number, a shape from an older build, a slot whose value is
 * not a finite number — is dropped here instead of being trusted into an index or
 * a scroll offset later.
 */
function parseRecords(value: unknown): ScrollAnchor["records"] {
  if (typeof value !== "object" || value === null) return EMPTY.records;
  const stored = value as { day?: unknown; values?: unknown };
  const values: Record<string, number> = {};
  if (
    typeof stored.values === "object" &&
    stored.values !== null &&
    !Array.isArray(stored.values)
  ) {
    for (const [slot, raw] of Object.entries(stored.values)) {
      if (typeof raw === "number" && Number.isFinite(raw)) values[slot] = raw;
    }
  }
  const day =
    typeof stored.day === "number" && Number.isFinite(stored.day) ? stored.day : null;
  return { day, values };
}

function parseProducts(value: unknown): ScrollAnchor["products"] {
  if (typeof value !== "object" || value === null) return EMPTY.products;
  const stored = value as Partial<Record<keyof ScrollAnchor["products"], unknown>>;
  return {
    key: typeof stored.key === "string" ? stored.key : "",
    view: typeof stored.view === "string" ? stored.view : "",
    id: typeof stored.id === "string" && stored.id !== "" ? stored.id : null,
    // A negative or NaN offset would put the box above the first row; the rest is
    // clamped by the browser anyway.
    top: typeof stored.top === "number" && Number.isFinite(stored.top) && stored.top > 0
      ? stored.top
      : 0,
  };
}

/**
 * A box's offset per slot — one per open cart, one per analytics face — read out of
 * whatever an older build left there. `keep` bounds how many slots survive: a cart
 * is deleted for good, so its entry would otherwise sit in the store for the life of
 * the installation, while the rail's faces are a closed set.
 */
function parsePositions(raw: unknown, keep: number | null): Record<string, number> {
  const positions: Record<string, number> = {};
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return positions;
  for (const [slot, value] of Object.entries(raw)) {
    // A non-positive or non-finite offset would put the box above the first row.
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      positions[slot] = value;
    }
  }
  if (keep === null) return positions;
  // Object key order is insertion order, so this keeps the slots written most
  // recently. Pruning on the way in means the store shrinks on the next write
  // instead of every write paying for it.
  const slots = Object.keys(positions);
  if (slots.length <= keep) return positions;
  const kept: Record<string, number> = {};
  for (const slot of slots.slice(slots.length - keep)) kept[slot] = positions[slot];
  return kept;
}

/** How many carts keep a position. */
const KEEP_CARTS = 50;

function positionsOf(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return undefined;
  return (value as { positions?: unknown }).positions;
}

function parseLedger(value: unknown): ScrollAnchor["ledger"] {
  return { positions: parsePositions(positionsOf(value), null) };
}

function parseCart(value: unknown): ScrollAnchor["cart"] {
  return { positions: parsePositions(positionsOf(value), KEEP_CARTS) };
}

function parseAnalytics(value: unknown): ScrollAnchor["analytics"] {
  return { positions: parsePositions(positionsOf(value), null) };
}

/**
 * Each container's parser, keyed by the container. The type makes the map
 * exhaustive, so a container cannot be added to the union and forgotten here.
 */
const PARSERS: { [C in ScrollContainer]: (value: unknown) => ScrollAnchor[C] } = {
  records: parseRecords,
  products: parseProducts,
  cart: parseCart,
  analytics: parseAnalytics,
  ledger: parseLedger,
};

export const ScrollLive = Layer.effect(
  ScrollService,
  Effect.gen(function* () {
    const storage = yield* LocalStorageService;

    function readAnchor<C extends ScrollContainer>(container: C): Effect.Effect<ScrollAnchor[C]> {
      return storage.get<unknown>(keyOf(container)).pipe(
        Effect.map(PARSERS[container]),
        Effect.catchTag("NotFound", () => Effect.succeed(EMPTY[container])),
        // A position that cannot be read is not a failure the operator has to
        // answer for: the list opens at the top, as it did before this existed.
        // The failure is recorded because a silent revert to the top is
        // otherwise indistinguishable from having never scrolled.
        Effect.catchTag("LocalStorageError", (error) =>
          Effect.sync(() =>
            log.error(`scroll: gagal membaca posisi ${container}: ${error.message}`),
          ).pipe(Effect.as(EMPTY[container])),
        ),
      );
    }

    // Hydrated at build time, like `config` and `zoom`: the position is read
    // during the list's first render (it decides where the list starts), and
    // there is no await to spend on localStorage at that point.
    const initial: ScrollAnchor = {
      records: yield* readAnchor("records"),
      products: yield* readAnchor("products"),
      cart: yield* readAnchor("cart"),
      analytics: yield* readAnchor("analytics"),
      ledger: yield* readAnchor("ledger"),
    };

    const ref = yield* Ref.make(initial);

    /** The one place a key and a value of the same container are paired. */
    function withAnchor<C extends ScrollContainer>(
      state: ScrollAnchor,
      container: C,
      anchor: ScrollAnchor[C],
    ): ScrollAnchor {
      return { ...state, [container]: anchor };
    }

    return {
      get: (container) => Ref.get(ref).pipe(Effect.map((all) => all[container])),
      set: (container, anchor) =>
        Effect.gen(function* () {
          const all = yield* Ref.get(ref);
          // Flicking the wheel inside one tall card or row leaves the anchor on
          // the item it started on. Writing that again would only wear the store,
          // and it happens on every scroll the list settles from.
          if (equal(all[container], anchor)) return;
          // Disk first, memory second. Nobody subscribes to this value — the
          // position on screen *is* the DOM — so a refused write is allowed to
          // fail; what it must not do is leave the memory ahead of the disk,
          // because the next scroll would then skip the retry.
          yield* storage
            .set(keyOf(container), anchor)
            .pipe(Effect.mapError((error) => new ScrollError({ message: error.message })));
          yield* Ref.update(ref, (state) => withAnchor(state, container, anchor));
        }),
    };
  }),
);
