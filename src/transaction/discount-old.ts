import Database from "@tauri-apps/plugin-sql";
import { DefaultError, err, log, ok, Result, tryResult } from "../lib/utils";

export function genDiscount(tx: Database) {
  return {
    get: get(tx),
    add: add(tx),
    update: update(tx),
    del: del(tx),
  };
}

function get(tx: Database) {
  return {
    async byTx(txId: number): Promise<Result<"Aplikasi bermasalah", TX.Discount[]>> {
      return tryResult({
        run: () =>
          tx.select<TX.Discount[]>(
            `SELECT discounts.id, discounts.item_id, discounts.value, discounts.kind
             FROM discounts 
             INNER JOIN items ON discounts.item_id = items.id
             WHERE items.tx_id = $1`,
            [txId],
          ),
      });
    },
  };
}

function add(tx: Database) {
  return {
    async one(itemId: number): Promise<Result<DefaultError, number>> {
      const [errMsg, res] = await tryResult({
        run: async () => tx.execute(`INSERT INTO discounts (item_id) VALUES ($1)`, [itemId]),
      });
      if (errMsg !== null) return err(errMsg);
      const insertedId = res.lastInsertId;
      if (insertedId === undefined) {
        log.error("Failed to create new discount");
        return err("Aplikasi bermasalah");
      }
      return ok(insertedId);
    },
  };
}

function update(tx: Database) {
  return {
    async value(id: number, v: number): Promise<DefaultError | null> {
      const [errMsg] = await tryResult({
        run: () => tx.execute("UPDATE discounts SET value = $1 WHERE id = $2", [v, id]),
      });
      if (errMsg) return errMsg;
      return null;
    },
    async kind(id: number, v: "number" | "percent" | "pcs"): Promise<DefaultError | null> {
      const [errMsg] = await tryResult({
        run: () => tx.execute("UPDATE discounts SET kind = $1 WHERE id = $2", [v, id]),
      });
      if (errMsg) return errMsg;
      return null;
    },
  };
}

function del(tx: Database) {
  return {
    async byId(id: number): Promise<"Aplikasi bermasalah" | "Tidak ada yang dihapus" | null> {
      const [errMsg, res] = await tryResult({
        run: () => tx.execute("DELETE FROM discounts WHERE id = $1", [id]),
      });
      if (errMsg) return errMsg;
      if (res.rowsAffected === 0) return "Tidak ada yang dihapus";
      return null;
    },
  };
}
