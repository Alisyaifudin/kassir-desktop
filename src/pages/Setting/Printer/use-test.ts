import { Effect } from "effect";
import { useState } from "react";
import { log } from "~/lib/log";
import { store } from "~/store";
import { printReceipt } from "~/lib/printer";

export function useTestPrint() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);
  async function handleClick() {
    setLoading(true);
    const errMsg = await Effect.runPromise(program);
    setLoading(false);
    setError(errMsg);
  }
  return {
    loading,
    error,
    handleClick,
  };
}

const program = Effect.gen(function* () {
  const printer = yield* store.printer.get();
  yield* printReceipt(printer.name, "Test Print");
  return null;
}).pipe(
  Effect.catchAll(({ e }) => {
    log.error(e);
    return Effect.succeed(e.message);
  }),
);
