import { Effect, Either } from "effect";
import { useStream } from "~/components/Loader";
import { service } from "~/services";
import type { Size } from "~/services/config";

export type { Size };

/** Reads the persisted UI size. */
export function useSize(): Size {
  const res = useStream(service.config.size.changes, () =>
    Effect.runSync(service.config.size.get()),
  );
  return res.type === "success" ? res.data : "big";
}

/** Persists the UI size. Returns an error message, or `null` on success. */
export async function setSize(size: Size): Promise<null | string> {
  const either = await Effect.runPromise(service.config.size.set(size).pipe(Effect.either));
  return Either.isLeft(either) ? either.left.message : null;
}
