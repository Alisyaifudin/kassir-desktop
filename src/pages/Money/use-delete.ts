import { useState } from "react";
import { db } from "~/database";
import { Effect } from "effect";
import { log } from "~/lib/log";
import { revalidate } from "./use-data";

export function useDelete(timestamp: number, onClose: () => void) {
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);
  async function handleDelete() {
    setLoading(true);
    const errMsg = await Effect.runPromise(program(timestamp));
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      onClose();
      revalidate();
    }
  }
  return { loading, error, handleDelete };
}

function program(timestamp: number) {
  return db.money.delByTimestamp(timestamp).pipe(
    Effect.as(null),
    Effect.catchAll(({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
