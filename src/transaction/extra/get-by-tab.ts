import { err, ok, Result, tryResult } from "~/lib/utils";
import { getTX } from "../db-instance";

export type Extra = {
  id: string;
  tab: number;
  extraId?: number;
  name: string;
  value: number;
  kind: TX.ValueKind;
  saved: boolean;
};

type Output = {
  extra_id: string;
  tab: number;
  db_extra_id: number | null;
  extra_name: string;
  extra_value: number;
  extra_kind: TX.ValueKind;
  extra_is_saved: boolean;
};

export async function getByTab(tab: number): Promise<Result<"Aplikasi bermasalah", Extra[]>> {
  const tx = await getTX();
  const [errMsg, rows] = await tryResult({
    run: () =>
      tx.select<Output[]>(
        `SELECT extra_id, tab, db_extra_id, extra_name, extra_value, extra_kind, extra_is_saved FROM extras WHERE tab = $1`,
        [tab],
      ),
  });
  if (errMsg !== null) return err("Aplikasi bermasalah");
  return ok(
    rows.map((r) => ({
      id: r.extra_id,
      tab,
      kind: r.extra_kind,
      name: r.extra_name,
      saved: r.extra_is_saved,
      value: r.extra_value,
      extraId: r.db_extra_id ?? undefined,
    })),
  );
}
