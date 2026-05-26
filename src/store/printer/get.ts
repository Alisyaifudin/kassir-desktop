import { getStore } from "../instance";
import { z } from "zod";
import { Effect } from "effect";

const schema = z.object({
  name: z.string().default(""),
  width: z.number().default(80),
});

export type Printer = z.infer<typeof schema>;

export function get() {
  return Effect.gen(function* () {
    const store = yield* getStore();
    const res = yield* Effect.all([store.get("printer_name"), store.get("printer_width")], {
      concurrency: "unbounded",
    });
    const printer = schema.parse({
      name: res[0],
      width: res[1],
    });
    return printer;
  });
}
