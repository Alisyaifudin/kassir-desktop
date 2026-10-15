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

export class SocialService extends Context.Tag("SocialService")<
  SocialService,
  {
    get: {
      all: () => Effect.Effect<Social[], SocialError>;
      /** Re-read after an external writer changes the contact list. */
      refresh: () => Effect.Effect<void, SocialError>;
      changes: Stream.Stream<Social[], SocialError>;
    };
  }
>() {}
