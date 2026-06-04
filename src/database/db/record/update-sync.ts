import { Effect } from "effect";
import { DB } from "../instance";

type RecordProduct = {
  productId?: string;
  id: string;
};

type Input = {
  isCredit: boolean;
  id: string;
  paidAt: number;
  updatedAt: number;
  mode: DB.Mode;
  pay: number;
  rounding: number;
  note: string;
  methodId: string;
  products: RecordProduct[];
};

export function updateSync({
  id,
  updatedAt,
  paidAt,
  isCredit,
  methodId,
  mode,
  note,
  pay,
  rounding,
  products,
}: Input) {
  return Effect.gen(function* () {
    const check = yield* DB.try((db) =>
      db.select<{ record_id: string }[]>(`SELECT record_id FROM records WHERE record_id = $1`, [
        id,
      ]),
    );
    const now = Date.now();
    if (check.length === 0) {
      return;
    }
    yield* DB.try((db) =>
      db.execute(
        `UPDATE records SET record_paid_at = $1, record_rounding = $2, record_is_credit = $3, record_mode = $4,
         record_pay = $5, record_note = $6, method_id = $7, record_updated_at = $8, record_sync_at = $9
         WHERE record_id = $10`,
        [paidAt, rounding, isCredit ? 1 : 0, mode, pay, note, methodId, updatedAt, now, id],
      ),
    );
    yield* Effect.all(
      products.map((product) =>
        DB.try((db) =>
          db.execute(`UPDATE record_products SET product_id = ?1 WHERE record_product_id = ?2`, [
            product.productId,
            product.id,
          ]),
        ),
      ),
      { concurrency: 10 },
    );
  });
}
