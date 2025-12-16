import { DefaultError, tryResult } from "~/lib/utils";
import { getStore } from "../instance";

export async function setBasic({
  address,
  header,
  footer,
  owner,
}: {
  address: string;
  header: string;
  footer: string;
  owner: string;
}): Promise<DefaultError | null> {
  const store = await getStore();
  const [errMsg] = await tryResult({
    run: () =>
      Promise.all([
        store.set("address", address),
        store.set("header", header),
        store.set("footer", footer),
        store.set("owner", owner),
      ]),
  });
  return errMsg;
}
