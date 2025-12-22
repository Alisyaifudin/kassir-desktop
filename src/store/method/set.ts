import { DefaultError, tryResult } from "~/lib/utils";
import { getStore } from "../instance";

export async function set(
  key: "transfer" | "debit" | "qris",
  val?: number
): Promise<DefaultError | null> {
  const store = await getStore();
  console.log(key, val);
  const [errMsg] = await tryResult({
    run: async () => {
      if (val === undefined) {
        store.delete(`default-${key}`);
      } else {
        store.set(`default-${key}`, val);
      }
    },
  });
  return errMsg;
}
