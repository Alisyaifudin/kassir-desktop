import { DefaultError, tryResult } from "~/lib/utils";
import { getStore } from "../instance";

export async function setShowCashier(show: boolean): Promise<DefaultError | null> {
  const store = await getStore();
  const [errMsg] = await tryResult({
    run: () => store.set("show-cashier", String(show)),
  });
  return errMsg;
}
