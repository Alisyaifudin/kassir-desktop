import { DB } from "../instance";
import { Effect } from "effect";

type ExistCustomer = {
  name: string;
  phone: string;
  id: string;
  updatedAt: number;
};

type DeletedCustomer = {
  id: string;
  deletedAt: number;
};

type GetAfterResult = {
  exist: ExistCustomer[];
  deleted: DeletedCustomer[];
};

export function getAllUnsync() {
  return DB.select<DB.Customer[]>(
    "SELECT * FROM customers WHERE customer_sync_at IS NULL ORDER BY customer_updated_at",
  ).pipe(
    Effect.map((res) =>
      res.reduce<GetAfterResult>(
        (acc, r) => {
          if (r.customer_deleted_at === null) {
            acc.exist.push({
              name: r.customer_name,
              phone: r.customer_phone,
              id: r.customer_id,
              updatedAt: r.customer_updated_at,
            });
          } else {
            acc.deleted.push({
              id: r.customer_id,
              deletedAt: r.customer_deleted_at,
            });
          }
          return acc;
        },
        { exist: [], deleted: [] },
      ),
    ),
  );
}
