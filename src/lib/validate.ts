import { Effect } from "effect";
import { z, ZodError, ZodTypeAny } from "zod";

export class ZodValError<E> {
  readonly _tag = "ZodValError";
  constructor(readonly error: E) {}
}

export function validate<S extends ZodTypeAny>(
  schema: S,
  value: unknown,
): Effect.Effect<z.infer<S>, ZodValError<ZodError<z.infer<S>>>> {
  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    return Effect.fail(new ZodValError(parsed.error));
  }

  return Effect.succeed(parsed.data);
}
