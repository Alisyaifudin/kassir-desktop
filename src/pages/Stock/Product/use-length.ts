import { createAtom } from "@xstate/store";
import { useAtom } from "@xstate/store/react";

const lengthAtom = createAtom(0);

export function useLength() {
  return useAtom(lengthAtom);
}

export function setLength(v: number) {
  lengthAtom.set(v);
}
