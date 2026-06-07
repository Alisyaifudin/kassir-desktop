import { DB } from "../instance";

export type MoneyKind = {
  name: string;
  type: DB.PocketType;
  id: string;
};

export function getMoneyByRange(pocketId: string, start: number, end: number) {
  return DB.select<Pick<DB.Money, "money_id" | "timestamp" | "money_value" | "money_note">[]>(
    `SELECT money_id, timestamp, money_value, money_note FROM money 
    WHERE money_deleted_at IS NULL AND timestamp BETWEEN $1 AND $2 AND pocket_id = ?3 
    ORDER BY timestamp DESC`,
    [start, end, pocketId],
  );
}
