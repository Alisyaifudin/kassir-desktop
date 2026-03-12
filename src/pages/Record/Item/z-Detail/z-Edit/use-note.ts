import { Effect } from "effect";
import { useState } from "react";
import { db } from "~/database-effect";
import { log } from "~/lib/log";
import { revalidate } from "../../use-data";

export function useNote(timestamp: number, note: string, onClose: () => void) {
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState(note);
  async function handleSubmit() {
    setLoading(true);
    const errMsg = await Effect.runPromise(program(timestamp, value));
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      onClose();
      revalidate();
    }
  }
  return { loading, error, note: value, setNote: setValue, handleSubmit };
}

function program(timestamp: number, note: string) {
  return db.record.update.note(timestamp, note).pipe(
    Effect.as(null),
    Effect.catchTag("DbError", ({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
