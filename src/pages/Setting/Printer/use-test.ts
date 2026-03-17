import { Effect } from "effect";
import { useState } from "react";
import { mockData } from "./mock-data";
import { programPrint } from "./util-program-print";

export function useTestPrint() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);

  async function handleClick() {
    setLoading(true);
    const errMsg = await Effect.runPromise(programPrint(mockData));
    setLoading(false);
    setError(errMsg);
  }
  return {
    loading,
    error,
    handleClick,
  };
}