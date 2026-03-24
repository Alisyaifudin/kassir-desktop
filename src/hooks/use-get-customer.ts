import { db } from "~/database";
import { Result } from "~/lib/result";

const KEY = "customers";

export function useGetCustomers() {
  const res = Result.use({
    fn: () => db.customer.get.all(),
    key: KEY,
  });
  return res;
}

export function revalidateCustomers() {
  Result.revalidate(KEY);
}
