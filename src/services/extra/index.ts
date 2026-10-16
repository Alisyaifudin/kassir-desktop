import { Effect, Context, Data, Stream } from "effect";
import type { ValueKind } from "~/lib/constants";

export class ExtraError extends Data.TaggedError("ExtraError")<{ message: string }> {}

/**
 * A surcharge or discount that can be applied to a transaction. `percent` is a
 * rate of the running total; `number` is a flat amount.
 */
export type Extra = {
  id: string;
  name: string;
  value: number;
  kind: ValueKind;
  /** Bitmask; `DUAL_FLAG` marks one that applies in both sale and purchase mode. */
  flag: number;
  updatedAt: number;
  syncAt: number | null;
};

/** The editable fields of an extra — everything but its id and sync bookkeeping. */
export type ExtraInput = {
  name: string;
  value: number;
  kind: ValueKind;
  flag: number;
};

export class ExtraService extends Context.Tag("ExtraService")<
  ExtraService,
  {
    get: {
      all: () => Effect.Effect<Extra[], ExtraError>;
      /** Tracks the catalog by name, so a write reaches every reader. */
      changes: Stream.Stream<Extra[], ExtraError>;
    };
    add: (input: ExtraInput) => Effect.Effect<string, ExtraError>;
    set: { info: (id: string, input: ExtraInput) => Effect.Effect<void, ExtraError> };
    /** Soft-deletes the extra; rows stay for sync. */
    delete: { byId: (id: string) => Effect.Effect<void, ExtraError> };
  }
>() {}
