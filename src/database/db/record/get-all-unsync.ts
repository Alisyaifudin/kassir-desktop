import { sqlx } from "~/database/sqlx";
import { Effect } from "effect";
import { mapRowsToRecords } from "./util";

export function getAllUnsyncRecords() {
  return sqlx.record.get.allUnsync().pipe(
    Effect.map(mapRowsToRecords),
  );
}
