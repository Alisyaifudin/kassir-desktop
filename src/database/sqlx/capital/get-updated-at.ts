import { DB } from "../instance";
import { Effect } from "effect";

export function getCapitalsUpdatedAt(ids: string[]) {
  const placeholders = ids.map(() => `$`).join(", ");
  return DB.select<Pick<DB.Capital, "capital_updated_at" | "capital_id">[]>(
    `SELECT capital_updated_at, capital_id FROM capitals 
    WHERE capital_deleted_at IS NULL AND capital_id IN (${placeholders})`,
  ).pipe(
    Effect.map((res) =>
      res.map((r) => ({
        id: r.capital_id,
        updatedAt: r.capital_updated_at,
      })),
    ),
  );
}
