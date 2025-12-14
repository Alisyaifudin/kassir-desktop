import { err, ok, Result, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export type Method = { id: number; kind: DB.MethodEnum; name?: string };

export async function getAll(): Promise<Result<"Aplikasi bermasalah", Method[]>> {
  const db = await getDB();
  const [errMsg, res] = await tryResult({
    run: () =>
      db.select<DB.Method[]>(
        "SELECT method_id, method_kind, method_name FROM methods ORDER BY method_id",
      ),
  });
  if (errMsg) return err(errMsg);
  return ok(
    res.map((r) => ({
      id: r.method_id,
      kind: r.method_kind,
      name: r.method_name ?? undefined,
    })),
  );
}
