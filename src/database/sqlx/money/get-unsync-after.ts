import { DB } from "../instance";
import { Effect } from "effect";

type ExistMoney = {
  id: string;
  note: string;
  timestamp: number;
  pocketId: string;
  updatedAt: number;
};

type DeletedMoney = {
  id: string;
  deletedAt: number;
  updatedAt: number;
};

type GetAfterResult = {
  exist: ExistMoney[];
  deleted: DeletedMoney[];
};

export function getUnsyncMoneyAfter(timestamp: number) {
  return DB.select<DB.Money[]>(
    "SELECT * FROM money WHERE money_updated_at > $1 AND money_sync_at IS NULL",
    [timestamp],
  ).pipe(
    Effect.map((res) =>
      res.reduce<GetAfterResult>(
        (acc, r) => {
          if (r.money_deleted_at === null) {
            acc.exist.push({
              id: r.money_id,
              note: r.money_note,
              timestamp: r.timestamp,
              pocketId: r.pocket_id,
              updatedAt: r.money_updated_at,
            });
          } else {
            acc.deleted.push({
              id: r.money_id,
              deletedAt: r.money_deleted_at,
              updatedAt: r.money_updated_at,
            });
          }
          return acc;
        },
        { exist: [], deleted: [] },
      ),
    ),
  );
}
