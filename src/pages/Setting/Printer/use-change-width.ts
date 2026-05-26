import { Effect } from "effect";
import { useState } from "react";
import { log } from "~/lib/log";
import { store } from "~/store";
import { revalidate } from "./use-data";

export function useChangePrinterWidth(init: number) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);
  const [width, setWidth] = useState(init);
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading || width < 1) {
      return;
    }
    setLoading(true);
    const errMsg = await Effect.runPromise(
      store.printer.set.width(width).pipe(
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
    }
  }
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const num = Number(e.currentTarget.value);
    if (isNaN(num)) {
      return;
    }
    setWidth(num);
  }
  return {
    width,
    loading,
    error,
    handleSubmit,
    handleChange,
  };
}
