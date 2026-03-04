import { Effect } from "effect";
import { useState } from "react";
import { db } from "~/database-effect";
import { log } from "~/lib/log";
import { revalidate } from "./use-data";

export function useUpdate(name: string) {
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState(name);
  async function handleSubmit() {
    setLoading(true);
    const errMsg = await Effect.runPromise(program({ old: name, new: input }));
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      revalidate();
    }
  }
  return {
    error,
    loading,
    handleSubmit,
    name: {
      value: input,
      setName: setInput,
    },
  };
}

function program(name: { old: string; new: string }) {
  return Effect.gen(function* () {
    yield* db.cashier.update.name(name);
    return null;
  }).pipe(
    Effect.catchAll(({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
