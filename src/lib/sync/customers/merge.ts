import { Effect } from "effect";
import { CustomerServer } from "~/server/customer/get";
import { db } from "~/database/db";
import { store } from "~/store";

export function merge({
  exist,
  deleted,
  timestamp,
}: {
  exist: CustomerServer[];
  deleted: {
    id: string;
    deletedAt: number;
  }[];
  timestamp: number;
}) {
  return Effect.gen(function* () {
    const customersInDb = yield* db.customer.get.updatedAt(exist.map((c) => c.id));

    const customers: CustomerServer[] = [];

    for (const customer of exist) {
      const localUpdatedAt = customersInDb.get(customer.id);
      if (localUpdatedAt === undefined) {
        customers.push(customer);
      } else if (localUpdatedAt < customer.updatedAt) {
        customers.push(customer);
      }
    }

    yield* db.customer.sync.delete.many(deleted, timestamp);
    yield* db.customer.sync.upsert.many(customers, timestamp);
    yield* store.sync.customer.set(timestamp);
  });
}
