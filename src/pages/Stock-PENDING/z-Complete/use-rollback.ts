import { useCallback } from "react";
import { Effect } from "effect";
import { programDeleteRecord } from "../../Record/z-Detail/use-delete";

export function useRollback() {
  return useCallback(async (id: string) => {
    return await Effect.runPromise(programDeleteRecord(id));
  }, []);
}
