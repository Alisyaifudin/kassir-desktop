import { db } from "~/database-effect";

export function loader() {
  const cashiers = db.cashier.get.all();
  return cashiers;
}
export const KEY = "cashiers";
