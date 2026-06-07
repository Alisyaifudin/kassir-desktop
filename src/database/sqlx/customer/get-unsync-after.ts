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
  updatedAt: number;
};

type GetAfterResult = {
  exist: ExistCustomer[];
  deleted: DeletedCustomer[];
};

const LIMIT = 1000;

export function getUnsyncCustomersAfter(timestamp: number) {
  return DB.select<DB.Customer[]>(
    "SELECT * FROM customers WHERE customer_updated_at > $1 AND customer_sync_at IS NULL ORDER BY cusotmer_updated_at LIMIT $2",
    [timestamp, LIMIT],
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
              updatedAt: r.customer_updated_at,
            });
          }
          return acc;
        },
        { exist: [], deleted: [] },
      ),
    ),
  );
}
