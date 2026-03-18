import { Effect } from "effect";
import { calcTotal, extrasStore } from "../../store/extra";
import { productsStore } from "../../store/product";
import { calcSubtotal } from "../../store/product/calc-subtotal";
import { basicStore, customerStore } from "../../use-transaction";
import { db } from "~/database";
import { auth } from "~/lib/auth";

class NotEnoughError {
  readonly _tag = "NotEnoughError";
  constructor(public message: string) {}
}

export function submit(isCredit: boolean) {
  const user = auth.user();
  const products = productsStore.get().context;
  const subtotal = calcSubtotal(products);
  const extras = extrasStore.get().context;
  const customer = customerStore.get();
  const total = calcTotal(subtotal, extras);
  const { fix, methodId, mode, note, pay, rounding } = basicStore.get();
  const grandTotal = total.add(rounding.num);
  const change = grandTotal.sub(pay.num).times(-1);
  return Effect.gen(function* () {
    if (change.lessThan(0) && !isCredit) {
      return yield* Effect.fail(new NotEnoughError("Uang tidak cukup"));
    }
    const record = {
      cashier: user.name,
      fix,
      isCredit,
      methodId,
      mode,
      note,
      pay: isCredit ? 0 : pay.num,
      rounding: rounding.num,
      customer,
      extras,
      products,
      grandTotal: Number(grandTotal.toFixed(fix)),
      subtotal: Number(subtotal.toFixed(fix)),
      total: Number(total.toFixed(fix)),
    };
    const timestamp = yield* db.record.add.one(record);
    return {
      grandTotal: record.grandTotal,
      change: Number(change.toFixed(fix)),
      timestamp,
    };
  });
}
