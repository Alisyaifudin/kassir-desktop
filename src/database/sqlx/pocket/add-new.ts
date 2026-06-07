import { Effect } from "effect";
import { DB } from "../instance";
import { generateId } from "~/lib/random";

export function addNewPocket(name: string, maxOrder: number) {
  const id = generateId();
  const now = Date.now();
  return DB.execute(
    `INSERT INTO pockets (pocket_id, pocket_name, pocket_type, pocket_ordering, 
    pocket_updated_at) VALUES ($1, $2, $3, $4, $5)`,
    [id, name, "absolute", maxOrder + 1, now],
  ).pipe(Effect.as(id));
}
