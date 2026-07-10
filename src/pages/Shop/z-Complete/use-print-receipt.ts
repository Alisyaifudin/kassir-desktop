import { useState, useCallback } from "react";
import { Effect } from "effect";
import { programPrintReceipt } from "./program-print-receipt";

export function usePrintReceipt() {
  const [loading, setLoading] = useState(false);

  const print = useCallback(async (recordId: string) => {
    setLoading(true);
    const errMsg = await Effect.runPromise(programPrintReceipt(recordId));
    setLoading(false);
    return errMsg;
  }, []);

  return { loading, print };
}
