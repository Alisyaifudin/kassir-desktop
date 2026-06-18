import { sqlx } from "~/database/sqlx";

export function insertManyProductEventSync(
  productEvents: {
    id: string;
    capitalId: string;
    type: DB.ProductEventEnum;
    value: number;
    timestamp: number;
  }[],
) {
  return sqlx.productEvent.sync.insert.many(productEvents);
}
