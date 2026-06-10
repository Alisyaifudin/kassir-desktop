import { DB } from "../instance";
import { Effect } from "effect";
import { generateId } from "~/lib/random";

type Input = {
  name: string;
  value: number;
  kind: DB.ValueKind;
  now: number;
};

export function addNewExtra({ name, value, kind, now }: Input) {
  const id = generateId();
  return DB.execute(
    `INSERT INTO extras (extra_id, extra_name, extra_value, extra_kind, 
    extra_updated_at, extra_sync_at, extra_deleted_at) 
    VALUES ($1, $2, $3, $4, $5, null, null)`,
    [id, name, value, kind, now],
  ).pipe(Effect.as(id));
}
