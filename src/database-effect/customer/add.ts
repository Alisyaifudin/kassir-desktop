import { DB } from "../instance";

export function add(name: string, phone: string) {
  return DB.try((db) =>
    db.execute("INSERT INTO customers (customer_name, customer_phone) VALUES ($1, $2)", [
      name,
      phone,
    ]),
  );
}
