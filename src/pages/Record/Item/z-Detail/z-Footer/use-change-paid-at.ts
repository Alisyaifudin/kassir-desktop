import { useState } from "react";
import { db } from "~/database";
import { Effect } from "effect";
import { log } from "~/lib/log";
import { revalidate } from "../../use-data";

export function useChangePaidAt(recordId: string) {
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);

  async function handleChange(paidAt: number) {
    setLoading(true);
    const errMsg = await Effect.runPromise(program(recordId, paidAt));
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      revalidate();
    }
  }

  return { loading, error, handleChange };
}

function program(recordId: string, paidAt: number) {
  return db.record.update.paidAt(recordId, paidAt).pipe(
    Effect.as(null),
    Effect.catchAll(({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
