import { DB } from "../instance";
import { Effect } from "effect";

type ExistMoney = {
  id: string;
  note: string;
  value: number;
  timestamp: number;
  pocketId: string;
  updatedAt: number;
};

type DeletedMoney = {
  id: string;
  deletedAt: number;
};

type GetAfterResult = {
  exist: ExistMoney[];
  deleted: DeletedMoney[];
};

export function getAllUnsyncMoney() {
  return DB.select<DB.Money[]>("SELECT * FROM money WHERE money_sync_at IS NULL").pipe(
    Effect.map((res) =>
      res.reduce<GetAfterResult>(
        (acc, r) => {
          if (r.money_deleted_at === null) {
            acc.exist.push({
              id: r.money_id,
              value: r.money_value,
              note: r.money_note,
              timestamp: r.timestamp,
              pocketId: r.pocket_id,
              updatedAt: r.money_updated_at,
            });
          } else {
            acc.deleted.push({
              id: r.money_id,
              deletedAt: r.money_deleted_at,
            });
          }
          return acc;
        },
        { exist: [], deleted: [] },
      ),
    ),
  );
}
