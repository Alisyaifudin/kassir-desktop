import { createAtom } from "@xstate/store";
import { useAtom } from "@xstate/store/react";

export const completeAtom = createAtom({
  open: false,
  grandTotal: 0,
  change: 0,
  recordId: undefined as string | undefined,
});

export function useComplete() {
  return useAtom(completeAtom);
}

export const setComplete = completeAtom.set;
