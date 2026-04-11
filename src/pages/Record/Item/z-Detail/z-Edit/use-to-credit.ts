import { Effect } from "effect";
import { useState } from "react";
import { db } from "~/database";
import { log } from "~/lib/log";
import { recordMap, revalidate } from "../../use-data";

export function useToCredit(recordId: string, onClose: () => void) {
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);
  async function handleClick() {
    setLoading(true);
    const errMsg = await Effect.runPromise(program(recordId));
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      onClose();
      recordMap.delete(recordId);
      revalidate();
    }
  }
  return { loading, error, handleClick };
}

function program(recordId: string) {
  return db.record.update.toCredit(recordId).pipe(
    Effect.as(null),
    Effect.catchTag("DbError", ({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
