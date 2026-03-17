import { Effect } from "effect";
import { useState } from "react";
import { db } from "~/database";
import { log } from "~/lib/log";
import { revalidate } from "../../hooks/use-get-methods";

export function useUpdate(id: number, name: string) {
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState(name);
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const errMsg = await Effect.runPromise(program(id, input));
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
      set: setInput,
    },
  };
}

function program(id: number, name: string) {
  return Effect.gen(function* () {
    yield* db.method.update(id, name);
    return null;
  }).pipe(
    Effect.catchAll(({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
