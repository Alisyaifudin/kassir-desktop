import { useStoreValue } from "@simplestack/store/react";
import { sizeStore } from "~/layouts/root/Provider";

export function useSize() {
  const v = useStoreValue(sizeStore);
  return v;
}
