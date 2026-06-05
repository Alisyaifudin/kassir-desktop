import { sqlx } from "~/database/sqlx";

export function getAllUnsyncImages() {
  return sqlx.image.get.unsync();
}
