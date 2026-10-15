import { useState } from "react";
import { Effect } from "effect";
import { mockData } from "./mock-data";
import { programPrint } from "./util-program-print";

export function useTestPrint() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);

  async function handleClick() {
    setLoading(true);
    // Stamped per click: a fixed `paidAt` in the fixture would print a time that
    // looks like a bug.
    const data = { ...mockData, record: { ...mockData.record, paidAt: Date.now() } };
    const errMsg = await Effect.runPromise(programPrint(data));
    setLoading(false);
    setError(errMsg);
  }

  return { loading, error, handleClick };
}
