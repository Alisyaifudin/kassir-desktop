import { Effect } from "effect";
import { useState } from "react";
import { db } from "~/database";
import { image } from "~/lib/image";
import { log } from "~/lib/log";
import { revalidate } from "./use-data";

export function useDel(id: number, onClose: () => void) {
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

function program(id: number) {
  return Effect.gen(function* () {
    const name = yield* db.image.delById(id);
    yield* image.del(name);
    return null;
  }).pipe(
    Effect.catchAll((e) => {
      switch (e._tag) {
        case "DbError":
          log.error(e.e);
          return Effect.succeed(e.e.message);
        case "IOError":
          log.error(e.error);
          return Effect.succeed(e.error.message);
        case "NotFound":
          log.error(e.msg);
          return Effect.succeed(e.msg);
      }
    }),
  );
}
