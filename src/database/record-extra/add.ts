import { DefaultError, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

type Input = {
  timestamp: number;
  name: string;
  value: number;
  eff: number;
  kind: DB.ValueKind;
};

export async function add({
  timestamp,
  name,
  value,
  eff,
  kind,
}: Input): Promise<DefaultError | null> {
  const db = await getDB();
  const [errMsg] = await tryResult({
    run: () =>
      db.execute(
        `INSERT INTO record_extras (record_extra_name, timestamp, record_extra_value, record_extra_eff, record_extra_kind)
         VALUES ($1, $2, $3, $4, $5)`,
        [name, timestamp, value, eff, kind]
      ),
  });
  return errMsg;
}
