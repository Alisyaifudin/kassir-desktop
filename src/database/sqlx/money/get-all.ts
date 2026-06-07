import { DB } from "../instance";

export type MoneyKind = {
  name: string;
  type: DB.PocketType;
  id: string;
};

export function getAllMoney(pocketId: string) {
  return DB.select<Pick<DB.Money, "money_id" | "timestamp" | "money_value" | "money_note">[]>(
    `SELECT money_id, timestamp, money_value, money_note FROM money 
    WHERE money_deleted_at IS NULL AND pocket_id = ?1 
    ORDER BY timestamp DESC`,
    [pocketId],
  );
}
