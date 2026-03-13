import { db } from "~/database-effect";
import { Result } from "~/lib/result";

const KEY = "customers";

export function useGetCustomers() {
  const res = Result.use({
    fn: () => db.customer.getAll(),
    key: KEY,
  });
  return res;
}

export function revalidateCustomers() {
  Result.revalidate(KEY);
}
