import { DefaultError, err, ok, Result, tryResult } from "~/lib/utils";
import { getStore } from "../instance";
import { z } from "zod";

export type DefaultMeth = {
  transfer?: number;
  debit?: number;
  qris?: number;
};
export async function get(): Promise<Result<DefaultError, DefaultMeth>> {
  const store = await getStore();
  const [errMsg, res] = await tryResult({
    run: () =>
      Promise.all([
        store.get("default-transfer"),
        store.get("default-debit"),
        store.get("default-qris"),
      ]),
  });
  if (errMsg !== null) return err(errMsg);
  const parsed = z
    .object({
      transfer: z.optional(z.number().int()),
      debit: z.optional(z.number().int()),
      qris: z.optional(z.number().int()),
    })
    .safeParse({
      transfer: res[0],
      debit: res[1],
      qris: res[2],
    });
  if (!parsed.success) {
    store.delete("default-transfer");
    store.delete("default-debit");
    store.delete("default-qris");
    return ok({});
  }
  return ok(parsed.data);
}
