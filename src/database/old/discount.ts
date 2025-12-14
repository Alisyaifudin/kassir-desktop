import Database from "@tauri-apps/plugin-sql";
import { err, ok, Result, tryResult } from "../../lib/utils";

export function genDiscount(db: Database) {
  return {
    get: get(db),
    add: add(db),
  };
}

function get(db: Database) {
  return {
    async byRecordItemId(id: number): Promise<Result<"Aplikasi bermasalah", DB.Discount[]>> {
      const [errMsg, items] = await tryResult({
        run: () =>
          db.select<DB.Discount[]>("SELECT * FROM discounts WHERE record_item_id = $1", [id]),
      });
      if (errMsg) return err(errMsg);
      return ok(items);
    },
    async byTimestamp(timestamp: number): Promise<Result<"Aplikasi bermasalah", DB.Discount[]>> {
      const [errMsg, items] = await tryResult({
        run: () =>
          db.select<DB.Discount[]>(
            `SELECT discounts.id, discounts.record_item_id, discounts.value, discounts.kind
						 FROM discounts INNER JOIN record_items ON discounts.record_item_id = record_items.id
						 WHERE record_items.timestamp = $1`,
            [timestamp],
          ),
      });
      if (errMsg) return err(errMsg);
      return ok(items);
    },
    async byRange(
      start: number,
      end: number,
    ): Promise<Result<"Aplikasi bermasalah", DB.Discount[]>> {
      const [errMsg, items] = await tryResult({
        run: () =>
          db.select<DB.Discount[]>(
            `SELECT discounts.id, discounts.record_item_id, discounts.value, discounts.kind
						 FROM discounts INNER JOIN record_items ON discounts.record_item_id = record_items.id
						 WHERE record_items.timestamp BETWEEN $1 AND $2 ORDER BY record_items.timestamp DESC`,
            [start, end],
          ),
      });
      if (errMsg) return err(errMsg);
      return ok(items);
    },
  };
}

function add(db: Database) {
  return {
    async many(
      recordId: number,
      discounts: { value: number; kind: DB.ValueKind }[],
    ): Promise<"Aplikasi bermasalah" | null> {
      const [errMsg] = await tryResult({
        run: () => {
          const promises = [];
          for (const disc of discounts) {
            promises.push(
              db.execute(
                `INSERT INTO discounts (record_item_id, kind, value) VALUES ($1, $2, $3)`,
                [recordId, disc.kind, disc.value],
              ),
            );
          }
          return Promise.all(promises);
        },
      });
      if (errMsg) return errMsg;
      return null;
    },
  };
}
