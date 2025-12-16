import { DefaultError, tryResult } from "~/lib/utils";
import { getStore } from "../instance";
import { Size } from "./get";

export async function set(size: Size): Promise<DefaultError | null> {
  const store = await getStore();
  const [errMsg] = await tryResult({
    run: () => store.set("size", size),
  });
  return errMsg;
}
