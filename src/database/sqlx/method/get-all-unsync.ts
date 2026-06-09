import { DB } from "../instance";
import { Effect } from "effect";

type ExistMethod = {
  id: string;
  name?: string;
  kind: DB.MethodEnum;
  updatedAt: number;
};

type DeletedMethod = {
  id: string;
  deletedAt: number;
};

type GetAfterResult = {
  exist: ExistMethod[];
  deleted: DeletedMethod[];
};

export function getAllUnsync() {
  return DB.select<DB.Method[]>(
    "SELECT * FROM methods WHERE method_sync_at IS NULL ORDER BY method_updated_at",
  ).pipe(
    Effect.map((res) =>
      res.reduce<GetAfterResult>(
        (acc, r) => {
          if (r.method_deleted_at === null) {
            acc.exist.push({
              id: r.method_id,
              name: r.method_name ?? undefined,
              kind: r.method_kind,
              updatedAt: r.method_updated_at,
            });
          } else {
            acc.deleted.push({
              id: r.method_id,
              deletedAt: r.method_deleted_at,
            });
          }
          return acc;
        },
        { exist: [], deleted: [] },
      ),
    ),
  );
}
