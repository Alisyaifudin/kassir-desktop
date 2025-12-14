import Database from "@tauri-apps/plugin-sql";
import { DefaultError, Result, tryResult } from "../lib/utils";

export function genAdditional(tx: Database) {
  return {
    get: get(tx),
    add: add(tx),
    update: update(tx),
    del: del(tx),
  };
}

function get(tx: Database) {
  return {
    async byTx(txId: number): Promise<Result<"Aplikasi bermasalah", TX.Additional[]>> {
      return tryResult({
        run: () => tx.select<TX.Additional[]>("SELECT * FROM additionals WHERE tx_id = $1", [txId]),
      });
    },
  };
}

function add(tx: Database) {
  return {
    async one({
      txId,
      additionalId,
      name,
      value,
      kind,
      saved,
    }: {
      txId: number;
      additionalId: number | null;
      name: string;
      value: number;
      kind: "percent" | "number";
      saved: boolean;
    }): Promise<DefaultError | null> {
      const [errMsg] = await tryResult({
        run: async () =>
          tx.execute(
            `INSERT INTO additionals (tx_id, additional_id, name, value, kind, saved) 
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [txId, additionalId, name, value, kind, saved ? 1 : 0],
          ),
      });
      return errMsg;
    },
  };
}

function update(tx: Database) {
  return {
    async name(id: number, v: string): Promise<DefaultError | null> {
      const [errMsg] = await tryResult({
        run: () => tx.execute("UPDATE additionals SET name = $1 WHERE id = $2", [v, id]),
      });
      if (errMsg) return errMsg;
      return null;
    },
    async value(id: number, v: number): Promise<DefaultError | null> {
      const [errMsg] = await tryResult({
        run: () => tx.execute("UPDATE additionals SET value = $1 WHERE id = $2", [v, id]),
      });
      if (errMsg) return errMsg;
      return null;
    },
    async kind(id: number, v: "percent" | "number"): Promise<DefaultError | null> {
      const [errMsg] = await tryResult({
        run: () => tx.execute("UPDATE additionals SET kind = $1 WHERE id = $2", [v, id]),
      });
      if (errMsg) return errMsg;
      return null;
    },
    async saved(id: number, v: boolean): Promise<DefaultError | null> {
      const [errMsg] = await tryResult({
        run: () => tx.execute("UPDATE additionals SET saved = $1 WHERE id = $2", [v ? 1 : 0, id]),
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
        run: () => tx.execute("DELETE FROM additionals WHERE id = $1", [id]),
      });
      if (errMsg) return errMsg;
      if (res.rowsAffected === 0) return "Tidak ada yang dihapus";
      return null;
    },
  };
}
