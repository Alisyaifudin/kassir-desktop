import { DB } from "../instance";
import { Effect } from "effect";

type UnsyncCapital = {
  id: string;
  stock: number;
  deletedAt?: number;
  updatedAt: number;
  capital: number;
  productId: string;
};

export function getAllUnsyncCapitals() {
  return DB.select<Omit<DB.Capital, "capital_sync_at">[]>(
    `SELECT capital_id, capital_stock, capital_deleted_at, capital_updated_at, 
    capital_capital, product_id FROM customers WHERE capital_sync_at IS NULL 
    ORDER BY capital_updated_at`,
  ).pipe(
    Effect.map((res) =>
      res.map(
        ({
          capital_deleted_at,
          capital_capital,
          capital_id,
          capital_stock,
          capital_updated_at,
          product_id,
        }) =>
          ({
            id: capital_id,
            capital: capital_capital,
            productId: product_id,
            stock: capital_stock,
            updatedAt: capital_updated_at,
            deletedAt: capital_deleted_at ?? undefined,
          }) satisfies UnsyncCapital,
      ),
    ),
  );
}
