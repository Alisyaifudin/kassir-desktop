import { add } from "./add";
import { delById } from "./del-by-id";
import { getByTab } from "./get-by-tab";
import { barcode } from "./update-barcode";
import { name } from "./update-name";
import { price } from "./update-price";
import { qty } from "./update-qty";

export const product = {
  add,
  getByTab,
  update: {
    price,
    qty,
    name,
    barcode,
  },
  delById,
};

// function get(tx: Database) {
//   return {
//     async byTx(txId: number): Promise<Result<"Aplikasi bermasalah", TX.Item[]>> {
//       return tryResult({
//         run: () => tx.select<TX.Item[]>("SELECT * FROM items WHERE tx_id = $1", [txId]),
//       });
//     },
//   };
// }

// function update(tx: Database) {
//   return {
//     async name(id: number, v: string): Promise<DefaultError | null> {
//       const [errMsg] = await tryResult({
//         run: () => tx.execute("UPDATE items SET name = $1 WHERE id = $2", [v, id]),
//       });
//       if (errMsg) return errMsg;
//       return null;
//     },
//     async barcode(id: number, v: string): Promise<DefaultError | null> {
//       const [errMsg] = await tryResult({
//         run: () => tx.execute("UPDATE items SET barcode = $1 WHERE id = $2", [v, id]),
//       });
//       if (errMsg) return errMsg;
//       return null;
//     },
//     async price(id: number, v: number): Promise<DefaultError | null> {
//       const [errMsg] = await tryResult({
//         run: () => tx.execute("UPDATE items SET price = $1 WHERE id = $2", [v, id]),
//       });
//       if (errMsg) return errMsg;
//       return null;
//     },
//     async qty(id: number, v: number): Promise<DefaultError | null> {
//       const [errMsg] = await tryResult({
//         run: () => tx.execute("UPDATE items SET qty = $1 WHERE id = $2", [v, id]),
//       });
//       if (errMsg) return errMsg;
//       return null;
//     },
//     async stock(id: number, v: number): Promise<DefaultError | null> {
//       const [errMsg] = await tryResult({
//         run: () => tx.execute("UPDATE items SET stock = $1 WHERE id = $2", [v, id]),
//       });
//       if (errMsg) return errMsg;
//       return null;
//     },
//   };
// }

// function del(tx: Database) {
//   return {
//     async byId(id: number): Promise<"Aplikasi bermasalah" | "Tidak ada yang dihapus" | null> {
//       const [errMsg, res] = await tryResult({
//         run: () => tx.execute("DELETE FROM items WHERE id = $1", [id]),
//       });
//       if (errMsg) return errMsg;
//       if (res.rowsAffected === 0) return "Tidak ada yang dihapus";
//       return null;
//     },
//   };
// }
