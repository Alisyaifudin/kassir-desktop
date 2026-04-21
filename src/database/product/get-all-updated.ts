import { DB } from "../instance";
import { Effect } from "effect";
import { cache } from "./cache";

export function getAllUpdated(ids: string[]) {
  return Effect.gen(function* () {
    if (ids.length === 0) return new Map<string, number>();
    const products = cache.all();
    if (products !== null) {
      const set = new Set(ids);
      const filtered = products.filter((p) => set.has(p.id));
      return new Map(filtered.map((p) => [p.id, p.updatedAt]));
    }
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
    const res = yield* DB.try((db) =>
      db.select<Pick<DB.Product, "product_id" | "product_updated_at">[]>(
        `SELECT product_id, product_updated_at FROM products WHERE product_id IN (${placeholders})`,
        ids,
      ),
    );
    return new Map(res.map((r) => [r.product_id, r.product_updated_at]));
  });
}
