import { DB } from "../instance";
import { Effect } from "effect";

type Exist = {
  id: string;
  name: string;
  type: DB.PocketType;
  ordering: number;
  updatedAt: number;
};

type Deleted = {
  id: string;
  deletedAt: number;
  updatedAt: number;
};

type GetAfterResult = {
  exist: Exist[];
  deleted: Deleted[];
};

export function getUnsyncPocketAfter(timestamp: number) {
  return DB.select<DB.Pocket[]>(
    "SELECT * FROM pocket WHERE pocket_updated_at > $1 AND pocket_sync_at IS NULL",
    [timestamp],
  ).pipe(
    Effect.map((res) =>
      res.reduce<GetAfterResult>(
        (acc, r) => {
          if (r.pocket_deleted_at === null) {
            acc.exist.push({
              id: r.pocket_id,
              name: r.pocket_name,
              type: r.pocket_type,
              ordering: r.pocket_ordering,
              updatedAt: r.pocket_updated_at,
            });
          } else {
            acc.deleted.push({
              id: r.pocket_id,
              deletedAt: r.pocket_deleted_at,
              updatedAt: r.pocket_updated_at,
            });
          }
          return acc;
        },
        { exist: [], deleted: [] },
      ),
    ),
  );
}
