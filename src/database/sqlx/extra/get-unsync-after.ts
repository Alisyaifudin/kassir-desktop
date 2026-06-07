import { DB } from "../instance";
import { Effect } from "effect";

type ExistExtra = {
  id: string;
  name: string;
  value: number;
  kind: DB.ValueKind;
  updatedAt: number;
};

type DeletedExtra = {
  id: string;
  deletedAt: number;
  updatedAt: number;
};

type GetAfterResult = {
  exist: ExistExtra[];
  deleted: DeletedExtra[];
};

export function getUnsyncExtrasAfter(timestamp: number) {
  return DB.select<DB.Extra[]>(
    "SELECT * FROM extras WHERE extra_updated_at > $1 AND extra_sync_at IS NULL",
    [timestamp],
  ).pipe(
    Effect.map((res) =>
      res.reduce<GetAfterResult>(
        (acc, r) => {
          if (r.extra_deleted_at === null) {
            acc.exist.push({
              id: r.extra_id,
              name: r.extra_name,
              value: r.extra_value,
              kind: r.extra_kind,
              updatedAt: r.extra_updated_at,
            });
          } else {
            acc.deleted.push({
              id: r.extra_id,
              deletedAt: r.extra_deleted_at,
              updatedAt: r.extra_updated_at,
            });
          }
          return acc;
        },
        { exist: [], deleted: [] },
      ),
    ),
  );
}
