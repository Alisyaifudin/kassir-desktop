import { sqlx } from "~/database/sqlx";

export function addNewProductEvent(entry: {
  timestamp: number;
  type: DBNamespace.ProductEventEnum;
  value: number;
  capitalId: string;
}) {
  return sqlx.productEvent.add.new(entry);
}
