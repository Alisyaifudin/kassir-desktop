import { createAtom } from "@xstate/store";
import { useAtom } from "@xstate/store/react";
import { Effect } from "effect";
import { db } from "~/database";

export type Money = {
  timestamp: number | undefined;
  value: number | undefined;
  name: string;
  id: string;
  type: DB.MoneyType;
};
export const moneyKindAtom = createAtom<Money[]>([]);

export function useMoney() {
  return useAtom(moneyKindAtom);
}

export function setMoney(money: Money[]) {
  moneyKindAtom.set(money);
  Effect.runFork(
    db.moneyKind.update
      .reorder(money.map((m, i) => ({ id: m.id, order: i })))
      .pipe(
        Effect.catchAll((e) => Effect.sync(() => console.error("Failed to persist reorder:", e))),
      ),
  );
}
