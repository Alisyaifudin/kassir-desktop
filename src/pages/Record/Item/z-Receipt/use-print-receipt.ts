import { useState } from "react";
import { Effect } from "effect";
import type { RecordFull } from "~/services/record";
import { log } from "~/lib/log";
import { programPrintReceipt } from "./program-print-receipt";

export function usePrintReceipt(record: RecordFull) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function print() {
    setLoading(true);
    try {
      const outcome = await Effect.runPromise(programPrintReceipt(record));
      setError(outcome.ok ? null : outcome.message);
    } catch (e) {
      // The program reports typed failures as a message; only a defect can land
      // here. Either way the button must leave its loading state.
      const message = e instanceof Error ? e.message : "Gagal mencetak struk";
      log.error(message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return { loading, error, print } as const;
}
