import { DB } from "../instance";
import { Effect } from "effect";

type ProductDb = {
  id: string;
  name: string;
  price: number;
  note: string;
  updatedAt: number;
  deletedAt: number | null;
  code: string | null;
  capital: {
    id: string | null;
    capital: number | null;
    stock: number | null;
  };
};

type OutputDb = {
  product_id: string;
  product_name: string;
  product_price: number;
  product_note: string;
  product_updated_at: number;
  product_deleted_at: number | null;
  product_code: string | null;
  capital_id: string | null;
  capital_stock: number | null;
  capital_capital: number | null;
  timestamp: number;
};

export function getProductById(id: string) {
  return DB.select<OutputDb[]>(
    `SELECT products.product_id, product_name, product_price, product_note,
    product_updated_at, product_deleted_at, product_code, capital_id, 
    capital_stock, capital_capital
    FROM products 
    LEFT JOIN product_codes ON product_codes.product_id = products.product_id
    LEFT JOIN capitals ON capitals.product_id = products.product_id
    WHERE products.product_id = $1`,
    [id],
  ).pipe(
    Effect.map((res) =>
      res.map((r) => {
        const data: ProductDb = {
          id: r.product_id,
          deletedAt: r.product_deleted_at,
          name: r.product_name,
          price: r.product_price,
          note: r.product_note,
          updatedAt: r.product_updated_at,
          capital: {
            capital: r.capital_capital,
            id: r.capital_id,
            stock: r.capital_stock,
          },
          code: r.product_code,
        };
        return data;
      }),
    ),
  );
}
