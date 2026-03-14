import { DB } from "../instance";
import { Effect } from "effect";

export type Customer = {
  phone: string;
  name: string;
  id: number;
};

export function getAll() {
  return DB.try((db) => db.select<DB.Customer[]>("SELECT * FROM customers")).pipe(
    Effect.map((res) =>
      res.map((r) => ({
        name: r.customer_name,
        phone: r.customer_phone,
        id: r.customer_id,
      })),
    ),
  );
}
