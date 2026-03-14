import { Effect } from "effect";
import { useState } from "react";
import { db } from "~/database";
import { log } from "~/lib/log";
import { revalidate } from "../../use-data";

export function useToCredit(timestamp: number, onClose: () => void) {
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);
  async function handleClick() {
    setLoading(true);
    const errMsg = await Effect.runPromise(program(timestamp));
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      onClose();
      revalidate();
    }
  }
  return { loading, error, handleClick };
}

function program(timestamp: number) {
  return db.record.update.toCredit(timestamp).pipe(
    Effect.as(null),
    Effect.catchTag("DbError", ({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
