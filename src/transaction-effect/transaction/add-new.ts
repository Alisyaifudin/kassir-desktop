import { Effect } from "effect";
import { count as getCount } from "./count";
import { TooMany } from "~/lib/effect-error";
import { TX, TxError } from "../instance";

export function addNew() {
  return Effect.gen(function* () {
    const count = yield* getCount();
    if (count >= 100) return yield* Effect.fail(TooMany.new("Terlalu banyak transaksi"));
    const res = yield* TX.try((tx) => tx.execute("INSERT INTO transactions DEFAULT VALUES"));
    const id = res.lastInsertId;
    if (id === undefined) return yield* Effect.fail(TxError.new(new Error("Failed to insert new transaction")));
    return id
  });
}
