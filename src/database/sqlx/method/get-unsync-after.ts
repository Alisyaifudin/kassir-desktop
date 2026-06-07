import { DB } from "../instance";
import { Effect } from "effect";

type ExistMethod = {
  id: string;
  name?: string;
  label?: string;
  kind: DB.MethodEnum;
  updatedAt: number;
};

type DeletedMethod = {
  id: string;
  deletedAt: number;
  updatedAt: number;
};

type GetAfterResult = {
  exist: ExistMethod[];
  deleted: DeletedMethod[];
};

export function getUnsyncMethodAfter(timestamp: number) {
  return DB.select<DB.Method[]>(
    "SELECT * FROM methods WHERE method_updated_at > $1 AND method_sync_at IS NULL",
    [timestamp],
  ).pipe(
    Effect.map((res) =>
      res.reduce<GetAfterResult>(
        (acc, r) => {
          if (r.method_deleted_at === null) {
            acc.exist.push({
              id: r.method_id,
              name: r.method_name ?? undefined,
              label: r.method_label ?? undefined,
              kind: r.method_kind,
              updatedAt: r.method_updated_at,
            });
          } else {
            acc.deleted.push({
              id: r.method_id,
              deletedAt: r.method_deleted_at,
              updatedAt: r.method_updated_at,
            });
          }
          return acc;
        },
        { exist: [], deleted: [] },
      ),
    ),
  );
}
