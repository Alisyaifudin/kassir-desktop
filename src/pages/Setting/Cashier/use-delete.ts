import { Effect } from "effect";
import { useState } from "react";
import { db } from "~/database-effect";
import { log } from "~/lib/log";
import { revalidate } from "./use-data";

export function useDelete(name: string, onClose: () => void) {
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    const errMsg = await Effect.runPromise(program(name));
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      onClose();
      revalidate();
    }
  }
  return { error, loading, handleSubmit };
}

function program(name: string) {
  return Effect.gen(function* () {
    yield* db.cashier.delete(name);
    return null;
  }).pipe(
    Effect.catchAll(({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
