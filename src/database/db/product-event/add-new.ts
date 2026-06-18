import { sqlx } from "~/database/sqlx";

export function addNewProductEvent(entry: {
  timestamp: number;
  type: DB.ProductEventEnum;
  value: number;
  capitalId: string;
}) {
  return sqlx.productEvent.add.new(entry);
}
