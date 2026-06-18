import { sqlx } from "~/database/sqlx";

export function updateUnsyncAllCapitals() {
  return sqlx.capital.update.unsyncAll();
}
