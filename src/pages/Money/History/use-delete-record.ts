import { useState } from "react";
import { db } from "~/database";
import { Effect } from "effect";
import { log } from "~/lib/log";
import { revalidate } from "./use-data";
import { revalidateMoney } from "../use-data";

export function useDeleteRecord(id: string, onClose: () => void) {
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);
  async function handleDelete() {
    setLoading(true);
    const errMsg = await Effect.runPromise(program(id));
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      onClose();
      revalidate();
      revalidateMoney();
    }
  }
  return { loading, error, handleDelete };
}

function program(id: string) {
  return db.money.delete.byId(id).pipe(
    Effect.as(null),
    Effect.catchAll(({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
