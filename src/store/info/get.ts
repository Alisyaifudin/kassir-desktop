import { DefaultError, err, ok, Result, tryResult } from "~/lib/utils";
import { getStore } from "../instance";
import { z } from "zod";

const schema = z.object({
  address: z.string().default(""),
  footer: z.string().default(""),
  header: z.string().default(""),
  owner: z.string().default(""),
  showCashier: z
    .string()
    .default("")
    .transform((a) => a === "true"),
});

export type Info = z.infer<typeof schema>;

export async function get(): Promise<Result<DefaultError, Info>> {
  const store = await getStore();
  const [errMsg, res] = await tryResult({
    run: () =>
      Promise.all([
        store.get("address"),
        store.get("footer"),
        store.get("header"),
        store.get("owner"),
        store.get("show-cashier"),
      ]),
  });
  if (errMsg) return err(errMsg);
  const info = schema.parse({
    address: res[0],
    footer: res[1],
    header: res[2],
    owner: res[3],
    showCashier: res[4],
  });
  return ok(info);
}
