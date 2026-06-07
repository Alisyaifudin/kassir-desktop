import { Effect } from "effect";
import z from "zod";
import { ZodSchemaError } from "~/lib/effect-error";
import { db } from "~/database/db";
import { parseJson } from "~/lib/utils";
import { textUtil } from "~/lib/text-binary";

export const customerSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  updatedAt: z.number(),
  deletedAt: z.number().optional(),
});

export type Customer = z.infer<typeof customerSchema>;

/**
 * Decode pulled bytes, parse JSON, validate against customer schema,
 * then diff against local DB and upsert/delete as needed.
 */
export function merge(pulledData: number[]) {
  return Effect.gen(function* () {
    const str = yield* textUtil.decode(pulledData);
    const json = yield* parseJson(str);
    const parsed = z.safeParse(customerSchema.array(), json);
    if (!parsed.success) return ZodSchemaError.fail(parsed.error);

    const serverData = parsed.data;
    const now = Date.now();

    const customersInDb = yield* db.customer.get.updatedAt(serverData.map((c) => c.id));

    const customers: Customer[] = [];
    const deletedIds: string[] = [];

    for (const customer of serverData) {
      const localUpdatedAt = customersInDb.get(customer.id);
      if (localUpdatedAt === undefined) {
        customers.push(customer);
      } else if (localUpdatedAt < customer.updatedAt) {
        if (customer.deletedAt === undefined) {
          customers.push(customer);
        } else {
          deletedIds.push(customer.id);
        }
      }
    }

    yield* db.customer.sync.delete.many(deletedIds, now);
    yield* db.customer.sync.upsert.many(customers, now);
  });
}
