import { getStore } from "../instance";
import { z } from "zod";
import { Effect } from "effect";

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

export function get() {
  return Effect.gen(function* () {
    const store = yield* getStore();
    const res = yield* Effect.all(
      [
        store.get("address"),
        store.get("footer"),
        store.get("header"),
        store.get("owner"),
        store.get("show-cashier"),
      ],
      { concurrency: "unbounded" },
    );
    const info = schema.parse({
      address: res[0],
      footer: res[1],
      header: res[2],
      owner: res[3],
      showCashier: res[4],
    });
    return info;
  });
}
