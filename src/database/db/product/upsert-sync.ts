import { sqlx } from "~/database/sqlx";
import { Effect } from "effect";
import { cache } from "./cache";

export function upsertProductsSync(
  product: {
    id: string;
    name: string;
    price: number;
    note: string;
    updatedAt: number;
    codes: string[];
    capitals: {
      id: string;
      stock: number;
      capital: number;
      deletedAt?: number;
      events: {
        id: string;
        timestamp: number;
        type: DBNamespace.ProductEventEnum;
        value: number;
      }[];
    }[];
  },
  now: number,
) {
  return sqlx.product.sync.upsert.one(product, now).pipe(
    Effect.tap(() => {
      cache.update(product.id, (prev) => ({
        ...prev,
        name: product.name,
        price: product.price,
        note: product.note,
        codes: product.codes,
      }));
    }),
  );
}
