import { Effect, Either } from "effect";

export function microResource<A, E>(effect: Effect.Effect<A, E>) {
  let status: "pending" | "done" = "pending";
  let value: Either.Either<A, E>;
  let promise = Effect.runPromise(Effect.either(effect)).then((v) => {
    status = "done";
    value = v;
  });

  // if (status === "pending") throw promise;
  // return value!;
  return {
    read(): Either.Either<A, E> {
      if (status === "pending") throw promise;
      return value!;
    },
  };
}
