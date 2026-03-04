import { Effect } from "effect";
import { useState } from "react";
import { db } from "~/database-effect";
import { log } from "~/lib/log";
import { revalidate } from "./use-data";
import { useMethod } from "./use-method";

export function useNew(onClose: () => void) {
  const [method] = useMethod();
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const errMsg = await Effect.runPromise(program(method, input));
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      revalidate();
      onClose();
      setInput("");
    }
  }
  return { error, loading, handleSubmit, name: { value: input, set: setInput } };
}

function program(kind: "transfer" | "debit" | "qris", name: string) {
  return Effect.gen(function* () {
    yield* db.method.add(name, kind);
    return null;
  }).pipe(
    Effect.catchTag("DbError", ({ e }) => {
      log.error(JSON.stringify(e.stack));
      return Effect.succeed(e.message);
    }),
  );
}
