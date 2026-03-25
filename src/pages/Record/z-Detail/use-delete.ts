import { Effect } from "effect";
import { useState } from "react";
import { revalidate } from "../use-records";
import { db } from "~/database";
import { log } from "~/lib/log";
import { useUnselect } from "../use-selected";

export function useDelete({ id, onClose }: { id: string; onClose: () => void }) {
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);
  const unselect = useUnselect();
  async function handleDelete() {
    setLoading(true);
    const errMsg = await Effect.runPromise(programDeleteRecord(id));
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      unselect();
      onClose();
      revalidate();
    }
  }
  return { error, loading, handleDelete };
}

export function programDeleteRecord(id: string) {
  return Effect.gen(function* () {
    yield* db.record.del.byId(id);
    return null;
  }).pipe(
    Effect.catchAll(({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
