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
