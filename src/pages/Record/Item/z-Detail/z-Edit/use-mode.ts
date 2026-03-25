import { Effect } from "effect";
import { useState } from "react";
import { db } from "~/database";
import { log } from "~/lib/log";
import { revalidate } from "../../use-data";

export function useMode(recordId: string, mode: DB.Mode, onClose: () => void) {
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<DB.Mode>(mode);
  async function handleChange(value: string) {
    if (value !== "buy" && value !== "sell") return;
    setSelected(value);
    setLoading(true);
    const errMsg = await Effect.runPromise(program(recordId, value));
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      onClose();
      revalidate();
    } else {
      setSelected(selected);
    }
  }
  return { loading, error, selected, handleChange };
}

function program(recordId: string, mode: DB.Mode) {
  return db.record.update.mode(recordId, mode).pipe(
    Effect.as(null),
    Effect.catchTag("DbError", ({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
