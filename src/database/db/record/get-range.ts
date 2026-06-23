import { sqlx } from "~/database/sqlx";
import { Effect } from "effect";
import { mapRowsToRecords } from "./util";

export function getRangeRecord(start: number, end: number) {
  return sqlx.record.get.byRange(start, end).pipe(
    Effect.map(mapRowsToRecords),
  );
}
