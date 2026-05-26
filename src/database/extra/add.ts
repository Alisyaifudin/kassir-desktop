import { cache } from "./cache";
import { DB } from "../instance";
import { Effect } from "effect";
import { generateId } from "~/lib/random";

type Input = {
  name: string;
  value: number;
  kind: DB.ValueKind;
};

export function add({ name, value, kind }: Input) {
  const now = Date.now();
  const id = generateId();
  return Effect.gen(function* () {
    yield* DB.try((db) =>
      db.execute(
        `INSERT INTO extras (extra_id, extra_name, extra_value, extra_kind, extra_updated_at, extra_sync_at) 
        VALUES ($1, $2, $3, $4, $5, null)`,
        [id, name, value, kind, now],
      ),
    );
    cache.update(id, {
      id,
      name,
      value,
      kind,
      updatedAt: now,
      syncAt: null,
    });
    return id;
  });
}
