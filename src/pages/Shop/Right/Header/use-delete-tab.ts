import { Effect } from "effect";
import { tx } from "~/transaction-effect";
import { log } from "~/lib/log";
import { revalidateTabs } from "./use-tabs";
import { useState } from "react";

export function useDelete(tab: number, onClose: () => void) {
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);
  async function handleDelete() {
    setLoading(true);
    const errMsg = await Effect.runPromise(program(tab));
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      revalidateTabs();
      onClose();
    }
  }
  return { error, loading, handleDelete };
}

const program = (tab: number) =>
  Effect.gen(function* () {
    yield* tx.transaction.delete(tab);
    return null;
  }).pipe(
    Effect.catchTag("TxError", ({ e }) => {
      log.error(e);
      return Effect.fail(e.message);
    }),
  );
