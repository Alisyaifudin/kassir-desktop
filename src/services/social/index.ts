import { Effect, Context, Data, Stream } from "effect";

export class SocialError extends Data.TaggedError("SocialError")<{ message: string }> {}

/** A contact line printed at the foot of a receipt. */
export type Social = {
  id: string;
  name: string;
  value: string;
  updatedAt: number;
  syncAt: number | null;
};

/** An editable contact line — everything but its id and sync bookkeeping. */
export type SocialInput = {
  name: string;
  value: string;
};

export class SocialService extends Context.Tag("SocialService")<
  SocialService,
  {
    /**
     * Re-reads the table after a sync merge. The refs the UI reads are hydrated
     * once and patched by the write paths, so a row that arrived from the server
     * (or was replaced by one) is invisible until this runs. Cheap: the table is
     * a handful of rows.
     */
    refresh: () => Effect.Effect<void, SocialError>;
    get: {
      all: () => Effect.Effect<Social[], SocialError>;
      /** Tracks the contact list, so a write reaches the receipt. */
      changes: Stream.Stream<Social[], SocialError>;
    };
    add: (input: SocialInput) => Effect.Effect<string, SocialError>;
    set: { info: (id: string, input: SocialInput) => Effect.Effect<void, SocialError> };
    /** Soft-deletes the contact; the row stays for sync. */
    delete: { byId: (id: string) => Effect.Effect<void, SocialError> };
  }
>() {}
