import { Effect } from "effect";
import { useState } from "react";
import { Data } from "../use-records";

export function useToTransaction(data: Data) {
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);
  async function handleClick() {
    setLoading(true);
    const errMsg = await Effect.runPromise(program(data));
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      console.log("TODO");
    }
  }
  return { error, loading, handleClick };
}

function program(data: Data) {
  return Effect.gen(function* () {
    // TODO:
    return null;
  });
}
