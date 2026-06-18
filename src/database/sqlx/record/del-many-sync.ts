import { DB } from "../instance";
import { Effect } from "effect";

// ---------------------------------------------------------------------------
// del-sync — apply a single server-side deletion locally
// ---------------------------------------------------------------------------
// The server already reversed all product events before syncing the deletion,
// so we only need to clean up local junction tables and mark the record as
// synced-deleted (sync_at = now, not null).
// ---------------------------------------------------------------------------

function deleteRecordSync(
  { id, deletedAt }: { id: string; deletedAt: number },
  now: number,
) {
  return DB.execute(
    `BEGIN TRANSACTION;
    DELETE FROM record_products WHERE record_id = $1;
    DELETE FROM record_extras WHERE record_id = $2;
    UPDATE records SET
      record_deleted_at = $3,
      record_updated_at = $4,
      record_sync_at    = $5
    WHERE record_id = $6;
    COMMIT;`,
    [id, id, deletedAt, deletedAt, now, id],
  ).pipe(Effect.asVoid);
}

// ---------------------------------------------------------------------------
// Public API — run del-sync for many records in parallel
// ---------------------------------------------------------------------------

const CONCURRENCY = 8;

export function deleteManyRecordsSync(
  deleted: { id: string; deletedAt: number }[],
  now: number,
) {
  if (deleted.length === 0) return Effect.void;
  return Effect.all(
    deleted.map((d) => deleteRecordSync(d, now)),
    { concurrency: CONCURRENCY },
  ).pipe(Effect.asVoid);
}
