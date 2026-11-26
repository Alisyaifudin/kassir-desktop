import { Effect, Layer, Ref } from "effect";
import { ScrollError, ScrollService, type ScrollAnchor, type ScrollContainer } from ".";
import { LocalStorageService } from "../local-storage";
import { log } from "~/lib/log";

/**
 * Every list whose place survives a restart. A screen opts in by naming itself
 * here; the type makes the list exhaustive, so a container cannot be added to
 * the union and forgotten at hydration.
 */
const CONTAINERS: readonly ScrollContainer[] = ["records"];

const EMPTY: ScrollAnchor = { day: null, values: {} };

/**
 * One localStorage key per container rather than one shared document: a write
 * stays small, and a value that no longer parses can only cost that one list its
 * position.
 */
function keyOf(container: ScrollContainer): string {
  return `scroll-${container}`;
}

/**
 * A stored anchor, or nothing. localStorage outlives app versions, so anything
 * the entry may hold — a number, an older shape, a slot whose value is not a
 * finite number — is dropped here instead of being trusted into an index later.
 */
function parseAnchor(value: unknown): ScrollAnchor {
  if (typeof value !== "object" || value === null) return EMPTY;
  const stored = value as { day?: unknown; values?: unknown };
  const values: Record<string, number> = {};
  if (typeof stored.values === "object" && stored.values !== null && !Array.isArray(stored.values)) {
    for (const [slot, raw] of Object.entries(stored.values)) {
      if (typeof raw === "number" && Number.isFinite(raw)) values[slot] = raw;
    }
  }
  const day =
    typeof stored.day === "number" && Number.isFinite(stored.day) ? stored.day : null;
  return { day, values };
}

/** Same day and the same value in every slot — the store already says this. */
function sameAnchor(a: ScrollAnchor, b: ScrollAnchor): boolean {
  if (a.day !== b.day) return false;
  const slots = Object.keys(a.values);
  if (slots.length !== Object.keys(b.values).length) return false;
  return slots.every((slot) => a.values[slot] === b.values[slot]);
}

export const ScrollLive = Layer.effect(
  ScrollService,
  Effect.gen(function* () {
    const storage = yield* LocalStorageService;

    // Hydrated at build time, like `config` and `zoom`: the position is read
    // during the list's first render (it decides where the list starts), and
    // there is no await to spend on localStorage at that point.
    const initial = new Map<ScrollContainer, ScrollAnchor>();
    for (const container of CONTAINERS) {
      const anchor = yield* storage.get<unknown>(keyOf(container)).pipe(
        Effect.map(parseAnchor),
        Effect.catchTag("NotFound", () => Effect.succeed(EMPTY)),
        // A position that cannot be read is not a failure the operator has to
        // answer for: the list opens at the top, as it did before this existed.
        // The failure is recorded because a silent revert to the top is
        // otherwise indistinguishable from having never scrolled.
        Effect.catchTag("LocalStorageError", (error) =>
          Effect.sync(() =>
            log.error(`scroll: gagal membaca posisi ${container}: ${error.message}`),
          ).pipe(Effect.as(EMPTY)),
        ),
      );
      initial.set(container, anchor);
    }

    const ref = yield* Ref.make(initial);

    return {
      get: (container) =>
        Ref.get(ref).pipe(Effect.map((all) => all.get(container) ?? EMPTY)),
      set: (container, anchor) =>
        Effect.gen(function* () {
          const all = yield* Ref.get(ref);
          // Flicking the wheel inside one tall record leaves the anchor on the
          // row it started on. Writing that again would only wear the store, and
          // it happens on every scroll the list settles from.
          if (sameAnchor(all.get(container) ?? EMPTY, anchor)) return;
          // Disk first, memory second. Nobody subscribes to this value — the
          // position on screen *is* the DOM — so a refused write is allowed to
          // fail; what it must not do is leave the memory ahead of the disk,
          // because the next scroll would then skip the retry.
          yield* storage
            .set(keyOf(container), anchor)
            .pipe(Effect.mapError((error) => new ScrollError({ message: error.message })));
          yield* Ref.update(ref, (state) => new Map(state).set(container, anchor));
        }),
    };
  }),
);
