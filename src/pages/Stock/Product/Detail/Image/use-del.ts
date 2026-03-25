import { Effect } from "effect";
import { useState } from "react";
import { db } from "~/database";
import { image } from "~/lib/image";
import { log } from "~/lib/log";
import { revalidate } from "./use-data";
import { useId } from "../use-id";

export function useDel(id: string, onClose: () => void) {
  const [loading, setLoading] = useState(false);
  const productId = useId()
  const [error, setError] = useState<null | string>(null);
  async function handleDelete() {
    setLoading(true);
    const errMsg = await Effect.runPromise(program(productId, id));
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      onClose();
      revalidate();
    }
  }
  return { handleDelete, loading, error };
}

function program(productId: string, id: string) {
  return Effect.gen(function* () {
    yield* db.image.del.byId(productId, id);
    yield* image.del(id);
    return null;
  }).pipe(
    Effect.catchAll((e) => {
      switch (e._tag) {
        case "DbError":
        case "IOError":
          log.error(e.e);
          return Effect.succeed(e.e.message);
      }
    }),
  );
}
