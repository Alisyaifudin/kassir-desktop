import { TX } from "../instance";
import { Effect } from "effect";

export type Extra = {
  id: string;
  tab: number;
  extraId?: string;
  name: string;
  value: number;
  kind: TX.ValueKind;
};

type Output = {
  extra_id: string;
  tab: number;
  db_extra_id: string | null;
  extra_name: string;
  extra_value: number;
  extra_kind: TX.ValueKind;
};

export function getByTab(tab: number) {
  return Effect.gen(function* () {
    const rows = yield* TX.try((tx) =>
      tx.select<Output[]>(
        `SELECT extra_id, tab, db_extra_id, extra_name, extra_value, extra_kind FROM extras WHERE tab = $1`,
        [tab],
      ),
    );
    return rows.map((r) => ({
      id: r.extra_id,
      tab,
      kind: r.extra_kind,
      name: r.extra_name,
      value: r.extra_value,
      extraId: r.db_extra_id ?? undefined,
    }));
  });
}
