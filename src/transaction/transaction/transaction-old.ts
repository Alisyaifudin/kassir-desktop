import Database from "@tauri-apps/plugin-sql";
import { DefaultError, err, log, NotFound, ok, Result, tryResult } from "../../lib/utils";

export function genTransaction(tx: Database) {
  return {
    count() {
      return getCount(tx);
    },
    get: get(tx),
    add: add(tx),
    update: update(tx),
    del: del(tx),
  };
}

async function getCount(tx: Database): Promise<Result<DefaultError, number>> {
  const [errMsg, res] = await tryResult({
    run: () => tx.select<{ count: number }[]>("SELECT COUNT(*) as count FROM transactions"),
  });
  if (errMsg !== null) return err(errMsg);
  return ok(res[0].count);
}

function get(tx: Database) {
  return {
    async all(): Promise<Result<"Aplikasi bermasalah", { id: number; mode: TX.Mode }[]>> {
      return tryResult({
        run: () =>
          tx.select<{ id: number; mode: TX.Mode }[]>("SELECT name, mode FROM transactions"),
      });
    },
    async byId(id: number): Promise<Result<"Aplikasi bermasalah" | NotFound, TX.Transaction>> {
      const [errMsg, res] = await tryResult({
        run: () => tx.select<TX.Transaction[]>("SELECT * FROM transactions WHERE id = $1", [id]),
      });
      if (errMsg !== null) return err(errMsg);
      if (res.length === 0) return err("Tidak ditemukan");
      return ok(res[0]);
    },
  };
}

function add(tx: Database) {
  return {
    async one(): Promise<Result<DefaultError | "Terlalu banyak", number>> {
      const [errCount, count] = await getCount(tx);
      if (errCount !== null) return err(errCount);
      if (count >= 100) {
        return err("Terlalu banyak");
      }
      const [errMsg, res] = await tryResult({
        run: async () => tx.execute("INSERT INTO transactions"),
      });
      if (errMsg) return err(errMsg);
      const id = res.lastInsertId;
      if (id === undefined) {
        log.error("Failed to insert new transaction");
        return err("Aplikasi bermasalah");
      }
      return ok(id);
    },
  };
}

function update(tx: Database) {
  return {
    async mode(id: number, mode: TX.Mode): Promise<DefaultError | null> {
      const [errMsg] = await tryResult({
        run: () => tx.execute("UPDATE transactions SET mode = $1 WHERE id = $2", [mode, id]),
      });
      if (errMsg) return errMsg;
      return null;
    },
    async rounding(id: number, rounding: number): Promise<DefaultError | null> {
      const [errMsg] = await tryResult({
        run: () =>
          tx.execute("UPDATE transactions SET rounding = $1 WHERE id = $2", [rounding, id]),
      });
      if (errMsg) return errMsg;
      return null;
    },
    async query(id: number, query: string): Promise<DefaultError | null> {
      const [errMsg] = await tryResult({
        run: () => tx.execute("UPDATE transactions SET query = $1 WHERE id = $2", [query, id]),
      });
      if (errMsg) return errMsg;
      return null;
    },
    async pay(id: number, v: number): Promise<DefaultError | null> {
      const [errMsg] = await tryResult({
        run: () => tx.execute("UPDATE transactions SET pay = $1 WHERE id = $2", [v, id]),
      });
      if (errMsg) return errMsg;
      return null;
    },
    async fix(id: number, v: number): Promise<DefaultError | null> {
      const [errMsg] = await tryResult({
        run: () => tx.execute("UPDATE transactions SET fix = $1 WHERE id = $2", [v, id]),
      });
      if (errMsg) return errMsg;
      return null;
    },
    async methodId(id: number, v: number): Promise<DefaultError | null> {
      const [errMsg] = await tryResult({
        run: () => tx.execute("UPDATE transactions SET method_id = $1 WHERE id = $2", [v, id]),
      });
      if (errMsg) return errMsg;
      return null;
    },
    async note(id: number, v: string): Promise<DefaultError | null> {
      const [errMsg] = await tryResult({
        run: () => tx.execute("UPDATE transactions SET note = $1 WHERE id = $2", [v, id]),
      });
      if (errMsg) return errMsg;
      return null;
    },
    customer: {
      async all(
        txId: number,
        customer: { name: string; phone: string; isNew: boolean },
      ): Promise<DefaultError | null> {
        const [errMsg] = await tryResult({
          run: () =>
            tx.execute(
              `UPDATE transactions SET customer_name = $1, customer_phone = $2, customer_is_new = $3 
             WHERE id = $4`,
              [customer.name, customer.phone, customer.isNew, txId],
            ),
        });
        if (errMsg) return errMsg;
        return null;
      },
      async name(id: number, v: string): Promise<DefaultError | null> {
        const [errMsg] = await tryResult({
          run: () =>
            tx.execute("UPDATE transactions SET customer_name = $1 WHERE id = $2", [v, id]),
        });
        if (errMsg) return errMsg;
        return null;
      },
      async phone(id: number, v: string): Promise<DefaultError | null> {
        const [errMsg] = await tryResult({
          run: () =>
            tx.execute("UPDATE transactions SET customer_phone = $1 WHERE id = $2", [v, id]),
        });
        if (errMsg) return errMsg;
        return null;
      },
      async isNew(id: number, v: boolean): Promise<DefaultError | null> {
        const [errMsg] = await tryResult({
          run: () =>
            tx.execute("UPDATE transactions SET customer_is_new = $1 WHERE id = $2", [
              v ? 1 : 0,
              id,
            ]),
        });
        if (errMsg) return errMsg;
        return null;
      },
    },
    item: {
      async barcode(id: number, v: string): Promise<DefaultError | null> {
        const [errMsg] = await tryResult({
          run: () => tx.execute("UPDATE transactions SET item_barcode = $1 WHERE id = $2", [v, id]),
        });
        if (errMsg) return errMsg;
        return null;
      },
      async name(id: number, v: string): Promise<DefaultError | null> {
        const [errMsg] = await tryResult({
          run: () => tx.execute("UPDATE transactions SET item_name = $1 WHERE id = $2", [v, id]),
        });
        if (errMsg) return errMsg;
        return null;
      },
      async price(id: number, v: number): Promise<DefaultError | null> {
        const [errMsg] = await tryResult({
          run: () => tx.execute("UPDATE transactions SET item_price = $1 WHERE id = $2", [v, id]),
        });
        if (errMsg) return errMsg;
        return null;
      },
      async qty(id: number, v: number): Promise<DefaultError | null> {
        const [errMsg] = await tryResult({
          run: () => tx.execute("UPDATE transactions SET item_qty = $1 WHERE id = $2", [v, id]),
        });
        if (errMsg) return errMsg;
        return null;
      },
      async stock(id: number, v: number): Promise<DefaultError | null> {
        const [errMsg] = await tryResult({
          run: () => tx.execute("UPDATE transactions SET item_stock = $1 WHERE id = $2", [v, id]),
        });
        if (errMsg) return errMsg;
        return null;
      },
    },
    additional: {
      async name(id: number, v: string): Promise<DefaultError | null> {
        const [errMsg] = await tryResult({
          run: () =>
            tx.execute("UPDATE transactions SET additional_name = $1 WHERE id = $2", [v, id]),
        });
        if (errMsg) return errMsg;
        return null;
      },
      async value(id: number, v: number): Promise<DefaultError | null> {
        const [errMsg] = await tryResult({
          run: () =>
            tx.execute("UPDATE transactions SET additional_value = $1 WHERE id = $2", [v, id]),
        });
        if (errMsg) return errMsg;
        return null;
      },
      async kind(id: number, v: "number" | "percent"): Promise<DefaultError | null> {
        const [errMsg] = await tryResult({
          run: () =>
            tx.execute("UPDATE transactions SET additional_kind = $1 WHERE id = $2", [v, id]),
        });
        if (errMsg) return errMsg;
        return null;
      },
      async saved(id: number, v: boolean): Promise<DefaultError | null> {
        const [errMsg] = await tryResult({
          run: () =>
            tx.execute("UPDATE transactions SET additional_saved = $1 WHERE id = $2", [
              v ? 1 : 0,
              id,
            ]),
        });
        if (errMsg) return errMsg;
        return null;
      },
    },
  };
}

function del(tx: Database) {
  return {
    async byId(id: number): Promise<"Aplikasi bermasalah" | "Tidak ada yang dihapus" | null> {
      const [errMsg, res] = await tryResult({
        run: () => tx.execute("DELETE FROM transactions WHERE id = $1", [id]),
      });
      if (errMsg) return errMsg;
      if (res.rowsAffected === 0) return "Tidak ada yang dihapus";
      return null;
    },
  };
}
