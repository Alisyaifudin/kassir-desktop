import { Effect, pipe } from "effect";

export function promisify<T, E>(effect: () => Effect.Effect<T, E>): Promise<null | E>;
export function promisify<T, E, E2>(
  effect: () => Effect.Effect<T, E>,
  transform: (e: E) => E2,
): Promise<null | E2>;
export function promisify<T, E, E2>(effect: () => Effect.Effect<T, E>, transform?: (e: E) => E2) {
  const program = pipe(
    effect(),
    Effect.as(null),
    Effect.catchAll((e) => Effect.succeed(e)),
  );
  if (transform === undefined) {
    return Effect.runPromise(program);
  }
  return Effect.runPromise(
    pipe(
      program,
      Effect.flatMap((r) => (r === null ? Effect.succeed(null) : Effect.succeed(transform(r)))),
    ),
  );
}
