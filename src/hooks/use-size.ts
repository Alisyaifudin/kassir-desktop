import { useAtom } from "@xstate/store/react";
import { sizeStore } from "~/layouts/root/Provider";

export function useSize() {
  const v = useAtom(sizeStore);
  return v;
}
