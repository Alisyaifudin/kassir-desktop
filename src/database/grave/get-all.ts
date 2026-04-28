import { DB } from "../instance";
import { Effect } from "effect";

export type GraveEntry = {
  id: string;
  itemId: string;
  kind: string;
};

type GraveRow = {
  grave_id: string;
  grave_item_id: string;
  grave_kind: string;
};

export function getAll() {
  return Effect.gen(function* () {
    const res = yield* DB.try((db) =>
      db.select<GraveRow[]>(
        `SELECT grave_id, grave_item_id, grave_kind FROM graves ORDER BY grave_id`,
      ),
    );
    const data: GraveEntry[] = res.map((r) => ({
      id: r.grave_id,
      itemId: r.grave_item_id,
      kind: r.grave_kind,
    }));
    return data;
  });
}
