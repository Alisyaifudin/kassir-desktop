import { db } from "~/database-effect";

export function loader() {
  const customers = db.customer.getAll();
  return customers;
}

export const KEY = "customers";
