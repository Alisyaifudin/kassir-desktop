import { useState } from "react";
import { Effect } from "effect";
import type { RecordFull } from "~/services/record";
import { programPrintReceipt } from "./program-print-receipt";

export function usePrintReceipt(record: RecordFull) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function print() {
    setLoading(true);
    const message = await Effect.runPromise(programPrintReceipt(record));
    setLoading(false);
    setError(message);
  }

  return { loading, error, print } as const;
}
