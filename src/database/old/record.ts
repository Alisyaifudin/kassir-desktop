import { Temporal } from "temporal-polyfill";
import { err, NotFound, ok, Result, tryResult } from "../../lib/utils";
import Database from "@tauri-apps/plugin-sql";
import { calcCapital, generateRecordSummary } from "~/lib/record";

export const genRecord = (db: Database) => ({
  get: get(db),
  add: add(db),
  del: {
    async byTimestamp(timestamp: number): Promise<"Aplikasi bermasalah" | null> {
      const [errMsg] = await tryResult({
        run: () => db.execute("DELETE FROM records WHERE timestamp = $1", [timestamp]),
      });
      return errMsg;
    },
  },
  update: update(db),
});

function get(db: Database) {
  return {
    async byRange(
      start: number,
      end: number,
      orderBy: "DESC" | "ASC" = "DESC",
    ): Promise<Result<"Aplikasi bermasalah", DB.Record[]>> {
      return tryResult({
        run: () =>
          db.select<DB.Record[]>(
            `SELECT * FROM records 
					   WHERE timestamp BETWEEN $1 AND $2 ORDER BY timestamp ${orderBy}`,
            [start, end],
          ),
      });
    },
    async byTimestamp(
      timestamp: number,
    ): Promise<Result<"Aplikasi bermasalah" | NotFound, DB.Record>> {
      const [errMsg, records] = await tryResult({
        run: () =>
          db.select<DB.Record[]>("SELECT * FROM records WHERE timestamp = $1", [timestamp]),
      });
      if (errMsg) return err(errMsg);
      if (records.length === 0) return err("Tidak ditemukan");
      return ok(records[0]);
    },
  };
}

function add(db: Database) {
  return {
    async one(
      timestamp: number,
      mode: DB.Mode,
      data: {
        cashier: string;
        credit: 0 | 1;
        note: string;
        methodId: number;
        rounding: number;
        pay: number;
        discVal: number;
        discKind: DB.ValueKind;
        fix: number;
        customerName: string;
        customerPhone: string;
      },
    ): Promise<"Aplikasi bermasalah" | null> {
      const [errMsg] = await tryResult({
        run: () =>
          db.execute(
            `INSERT INTO records 
						(mode, timestamp, paid_at, cashier, credit, note, rounding, pay, 
						 disc_val, disc_kind, method_id, fix, customer_name, customer_phone)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
              mode,
              timestamp,
              timestamp,
              data.cashier,
              data.credit,
              data.note,
              data.rounding,
              data.pay,
              data.discVal,
              data.discKind,
              data.methodId,
              data.fix,
              data.customerName,
              data.customerPhone,
            ],
          ),
      });
      if (errMsg) return errMsg;
      return null;
    },
  };
}

function update(db: Database) {
  return {
    async toCredit(timestamp: number): Promise<"Aplikasi bermasalah" | null> {
      const [errMsg] = await tryResult({
        run: () =>
          db.execute("UPDATE records SET credit = 1, pay = 0, rounding = 0 WHERE timestamp = $1", [
            timestamp,
          ]),
      });
      return errMsg;
    },
    payCredit: async (
      timestamp: number,
      data: {
        pay: number;
        rounding: number;
      },
    ): Promise<"Aplikasi bermasalah" | null> => {
      const now = Temporal.Now.instant().epochMilliseconds;
      const [errMsg] = await tryResult({
        run: () =>
          db.execute(
            `UPDATE records SET pay = $1, rounding = $2, credit = 0, paid_at = $3 WHERE timestamp = $4`,
            [data.pay, data.rounding, now, timestamp],
          ),
      });
      return errMsg;
    },
    timestamp: async (
      timestamp: number,
      newTime: number,
    ): Promise<Result<"Aplikasi bermasalah", number>> => {
      const [errMsg] = await tryResult({
        run: () =>
          db.execute("UPDATE records SET timestamp = $2 WHERE timestamp = $1", [
            timestamp,
            newTime,
          ]),
      });
      if (errMsg) return err(errMsg);
      return ok(newTime);
    },
    note: async (timestamp: number, note: string): Promise<"Aplikasi bermasalah" | null> => {
      const [errMsg] = await tryResult({
        run: () =>
          db.execute("UPDATE records SET note = $1 WHERE timestamp = $2", [note, timestamp]),
      });
      return errMsg;
    },
    method: async (timestamp: number, methodId: number): Promise<"Aplikasi bermasalah" | null> => {
      const [errMsg] = await tryResult({
        run: () =>
          db.execute("UPDATE records SET method_id = $1 WHERE timestamp = $2", [
            methodId,
            timestamp,
          ]),
      });
      return errMsg;
    },
    mode: async (
      timestamp: number,
      mode: DB.Mode,
    ): Promise<"Aplikasi bermasalah" | "Catatan tidak ada" | null> => {
      const [errFetch, res] = await tryResult({
        run: () =>
          Promise.all([
            db.select<DB.Record[]>("SELECT * FROM records WHERE timestamp = $1", [timestamp]),
            db.select<DB.RecordItem[]>("SELECT * FROM record_items WHERE timestamp = $1", [
              timestamp,
            ]),
            db.select<DB.Additional[]>("SELECT * FROM additionals WHERE timestamp = $1", [
              timestamp,
            ]),
            db.select<DB.Discount[]>(
              `SELECT discounts.id, discounts.record_item_id, discounts.value, discounts.kind
						 FROM discounts INNER JOIN record_items ON discounts.record_item_id = record_items.id
						 WHERE record_items.timestamp = $1`,
              [timestamp],
            ),
          ]),
      });
      if (errFetch) return errFetch;
      const [records, items, additionals, discounts] = res;
      if (records.length === 0) return "Catatan tidak ada";
      const record = records[0];
      if (mode === record.mode || record.credit === 1) return null;
      const summary = generateRecordSummary({ record, items, additionals, discounts });
      const { grandTotal, totalFromItems } = summary.record;
      let capitals: number[] = [];
      if (mode === "buy") {
        capitals = summary.items.map((item) =>
          calcCapital(item, totalFromItems, grandTotal, record.fix),
        );
      }
      const [errMsg] = await tryResult({
        run: async () => {
          await db.execute("UPDATE records SET mode = $1 WHERE timestamp = $2", [
            mode,
            record.timestamp,
          ]);
          const sign = mode === "sell" ? "-" : "+";
          const promises: Promise<any>[] = [];
          items.forEach((item, i) => {
            if (item.product_id !== null) {
              if (mode === "buy") {
                promises.push(
                  db.execute(
                    `UPDATE products SET stock = stock ${sign} $1, capital = $2 WHERE id = $3`,
                    [2 * item.qty, capitals[i], item.product_id],
                  ),
                  db.execute(`UPDATE record_items SET capital = $1 WHERE id = $2`, [
                    capitals[i],
                    item.id,
                  ]),
                );
              } else {
                promises.push(
                  db.execute(`UPDATE products SET stock = stock ${sign} $1 WHERE id = $2`, [
                    2 * item.qty,
                    item.product_id,
                  ]),
                );
              }
            }
          });
        },
      });
      return errMsg;
    },
  };
}
