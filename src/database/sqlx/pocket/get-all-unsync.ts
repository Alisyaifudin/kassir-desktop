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
};

type GetAfterResult = {
  exist: Exist[];
  deleted: Deleted[];
};

export function getAllUnsyncPocket() {
  return DB.select<DB.Pocket[]>("SELECT * FROM pocket WHERE pocket_sync_at IS NULL").pipe(
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
            });
          }
          return acc;
        },
        { exist: [], deleted: [] },
      ),
    ),
  );
}
