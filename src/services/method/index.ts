import { Effect, Context, Data, Stream } from "effect";
import type { MethodKind } from "~/lib/constants";

export class MethodError extends Data.TaggedError("MethodError")<{ message: string }> {}

/** A payment method. `name` is null for the four built-in base methods. */
export type Method = {
  id: string;
  name: string | null;
  kind: MethodKind;
  deletedAt: number | null;
};

export class MethodService extends Context.Tag("MethodService")<
  MethodService,
  {
    get: {
      all: () => Effect.Effect<Method[], MethodError>;
      changes: Stream.Stream<Method[], MethodError>;
    };
  }
>() {}
