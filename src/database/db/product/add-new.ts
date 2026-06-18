import { Effect } from "effect";
import { sqlx } from "~/database/sqlx";
import { cache, Product } from "./cache";

type Input = {
  name: string;
  price: number;
  note: string;
  codes: string[];
  stock: number;
  capital: number;
};

export function addNewProduct(entry: Input, now: number) {
  return sqlx.product.add.new(entry, now).pipe(
    Effect.tap(({ capitalId, productId }) => {
      const capital = { id: capitalId, stock: entry.stock, capital: entry.capital };
      const product: Product = {
        capitals: [capital],
        codes: entry.codes,
        id: productId,
        name: entry.name,
        note: entry.note,
        price: entry.price,
      };
      cache.update(productId, product);
    }),
  );
}
