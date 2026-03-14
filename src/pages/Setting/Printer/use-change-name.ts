import { Effect } from "effect";
import { useState } from "react";
import { log } from "~/lib/log";
import { store } from "~/store";
import { revalidate } from "./use-data";

export function useChangePrinterName(init: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);
  const [name, setName] = useState(init);
  console.log(loading);
  async function handleChange(name: string) {
    setName(name);
    setLoading(true);
    const errMsg = await Effect.runPromise(
      store.printer.set.name(name).pipe(
        Effect.as(null),
        Effect.catchTag("StoreError", ({ e }) => {
          log.error(e);
          return Effect.succeed(e.message);
        }),
      ),
    );
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      revalidate();
    } else {
      setName(init);
    }
  }
  return {
    loading,
    name,
    error,
    handleChange,
  };
}
