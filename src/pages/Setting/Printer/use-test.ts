import { useState } from "react";
import { Effect } from "effect";
import { mockData } from "./mock-data";
import { programPrint } from "./util-program-print";

export function useTestPrint() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);
  // The printer's own "Dikirim ke printer …" sentence. Without it a successful
  // test print looked exactly like a click that did nothing.
  const [success, setSuccess] = useState<null | string>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    setSuccess(null);
    // Stamped per click: a fixed `paidAt` in the fixture would print a time that
    // looks like a bug.
    const data = { ...mockData, record: { ...mockData.record, paidAt: Date.now() } };
    const outcome = await Effect.runPromise(programPrint(data));
    setLoading(false);
    setError(outcome.ok ? null : outcome.message);
    setSuccess(outcome.ok ? outcome.message : null);
  }

  return { loading, error, success, handleClick };
}
