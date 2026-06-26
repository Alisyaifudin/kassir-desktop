import { Effect } from "effect";
import { sqlx } from "~/database/sqlx";

export function getAllPocket() {
  return Effect.gen(function* () {
    const raw = yield* sqlx.pocket.get.all();
    const pockets = yield* getCurrents(raw);
    return pockets;
  });
}

function getCurrents(
  pockets: {
    id: string;
    name: string;
    type: DBNamespace.PocketType;
    ordering: number;
    updatedAt: number;
    syncAt: number | undefined;
  }[],
) {
  return Effect.gen(function* () {
    if (pockets.length === 0) return [];
    const values = yield* Effect.all(
      pockets.map((pocket) => sqlx.money.get.current(pocket.id)),
      { concurrency: 10 },
    );
    return pockets.map((pocket, i) => ({ ...pocket, money: values[i] }));
  });
}
