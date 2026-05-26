import { DB } from "../instance";
import { Effect } from "effect";

export type RecordDebt = {
  id: string;
  paidAt: number;
  note: string;
  fix: number;
  total: number;
};

type Output = Pick<
  DB.Record,
  "record_id" | "record_paid_at" | "record_note" | "record_fix" | "record_total"
>;

export function getDebt() {
  return Effect.gen(function* () {
    const raw = yield* DB.try((db) =>
      db.select<Output[]>(
        `SELECT record_id, record_paid_at, record_note, record_fix, record_total
        FROM records WHERE record_is_credit = 1 ORDER BY record_paid_at DESC`,
      ),
    );
    const records: RecordDebt[] = raw.map(
      ({ record_fix, record_id, record_note, record_paid_at, record_total }) => ({
        id: record_id,
        fix: record_fix,
        total: record_total,
        note: record_note,
        paidAt: record_paid_at,
      }),
    );
    return records;
  });
}
