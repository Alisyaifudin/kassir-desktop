import { Effect } from "effect";
import { useState } from "react";
import { db } from "~/database";
import { image } from "~/lib/image";
import { log } from "~/lib/log";
import { revalidate } from "./use-data";

export function useDel(id: string, onClose: () => void) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);
  async function handleDelete() {
    setLoading(true);
    const errMsg = await Effect.runPromise(program(id));
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      onClose();
      revalidate();
    }
  }
  return { handleDelete, loading, error };
}

function program(id: string) {
  return Effect.gen(function* () {
    yield* db.image.del.byId(id);
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
