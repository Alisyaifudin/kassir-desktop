import { Effect } from "effect";
import { DB } from "../instance";
import { generateId } from "~/lib/random";

export function addNewMethod({
  name,
  kind,
  label,
  now,
}: {
  name: string;
  label: string;
  kind: Exclude<DBNamespace.MethodEnum, "cash">;
  now: number;
}) {
  const id = generateId();
  return DB.execute(
    `INSERT INTO methods (method_id, method_name, method_label, 
    method_kind, method_updated_at) VALUES ($1, $2, $3, $4)`,
    [id, name, label, kind, now],
  ).pipe(Effect.as(id));
}
