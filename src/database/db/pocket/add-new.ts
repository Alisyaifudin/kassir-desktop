import { Effect } from "effect";
import { sqlx } from "~/database/sqlx";

export function addNewPocket(name: string) {
  return Effect.gen(function* () {
    const maxOrder = yield* sqlx.pocket.get.maxOrdering();
    const id = yield* sqlx.pocket.add.new(name, maxOrder);
    return id
  });
}
