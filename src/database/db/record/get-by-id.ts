import { sqlx } from "~/database/sqlx";
import { Effect } from "effect";
import { NotFound } from "~/lib/effect-error";
import { mapRowsToRecord } from "./util";

export function getRecordById(id: string) {
  return sqlx.record.get.byId(id).pipe(
    Effect.flatMap((r) =>
      r.length === 0 ? NotFound.fail("Catatan tidak ditemukan") : Effect.succeed(r),
    ),
    Effect.map(mapRowsToRecord),
  );
}
