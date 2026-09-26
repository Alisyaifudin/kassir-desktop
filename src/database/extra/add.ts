import { cache } from "./cache";
import { DB } from "../instance";
import { Effect } from "effect";
import { generateId } from "~/lib/random";

type Input = {
  name: string;
  value: number;
  flag: number;
  kind: DB.ValueKind;
};

export function add({ name, value, kind, flag }: Input) {
  const now = Date.now();
  const id = generateId();
  return Effect.gen(function* () {
    yield* DB.try((db) =>
      db.execute(
        `INSERT INTO extras (extra_id, extra_name, extra_value, extra_kind, extra_flag, extra_updated_at, extra_sync_at) 
        VALUES ($1, $2, $3, $4, $5, $6, null)`,
        [id, name, value, kind, flag, now],
      ),
    );
    cache.update(id, {
      id,
      name,
      value,
      kind,
      flag,
      updatedAt: now,
      syncAt: null,
    });
    return id;
  });
}
