import Decimal from "decimal.js";
import { Effect, pipe } from "effect";
import { db } from "~/database";
import { Result } from "~/lib/result";
import { setSummary } from "./z-Summary";

const KEY = "record-debt";

export function useData() {
  const res = Result.use({
    fn: () => program,
    key: KEY,
  });
  return res;
}

const program = pipe(
  db.record.get.debt(),
  Effect.tap((records) => {
    let total = new Decimal(0);
    for (const record of records) {
      total = total.plus(record.total);
    }
    setSummary(total.toNumber());
  }),
);
