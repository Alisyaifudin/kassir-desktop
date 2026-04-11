import { Effect } from "effect";
import { useState } from "react";
import { db } from "~/database";
import { log } from "~/lib/log";
import { recordMap, revalidate } from "../../use-data";

export function useNote(recordId: string, note: string, onClose: () => void) {
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState(note);
  async function handleSubmit() {
    setLoading(true);
    const errMsg = await Effect.runPromise(program(recordId, value));
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      onClose();
      recordMap.delete(recordId);
      revalidate();
    }
  }
  return { loading, error, note: value, setNote: setValue, handleSubmit };
}

function program(recordId: string, note: string) {
  return db.record.update.note(recordId, note).pipe(
    Effect.as(null),
    Effect.catchTag("DbError", ({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
