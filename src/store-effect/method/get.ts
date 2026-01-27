import { getStore } from "../instance";
import { z } from "zod";
import { Effect } from "effect";

// export type DefaultMeth = {
//   transfer?: number;
//   debit?: number;
//   qris?: number;
// };

export function get() {
  return Effect.gen(function* () {
    const store = yield* getStore();
    const res = yield* Effect.all(
      [store.get("default-transfer"), store.get("default-debit"), store.get("default-qris")],
      { concurrency: "unbounded" },
    );
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
      return {};
    }
    return parsed.data;
  });
}
