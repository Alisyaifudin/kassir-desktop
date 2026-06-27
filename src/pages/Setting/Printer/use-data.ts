import { Effect } from "effect";
import { getPrinters } from "~/lib/printer";
import { Result } from "~/lib/result";
import { printer } from "~/store/printer";

const KEY = "printer-data";

export function useData() {
  const res = Result.use({
    fn: () => Effect.all([printer.get(), getPrinters()], { concurrency: "unbounded" }),
    key: KEY,
  });
  return res;
}

export function revalidate() {
  Result.revalidate(KEY);
}
