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
};

type GetAfterResult = {
  exist: ExistExtra[];
  deleted: DeletedExtra[];
};

export function getAllUnsync() {
  return DB.select<DB.Extra[]>("SELECT * FROM extras WHERE extra_sync_at IS NULL").pipe(
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
            });
          }
          return acc;
        },
        { exist: [], deleted: [] },
      ),
    ),
  );
}
