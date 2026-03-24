import { Effect } from "effect";
import { TX } from "../instance";

type Data = {
  tab: number;
  id: string;
  name: string;
  value: number;
  kind: TX.ValueKind;
};

export function add({ tab, id, name, value, kind }: Data) {
  return TX.try((tx) =>
    tx.execute(
      `INSERT INTO extras (extra_id, tab, extra_name, extra_value, extra_kind) 
         VALUES ($1, $2, $3, $4, $5)`,
      [id, tab, name, value, kind],
    ),
  ).pipe(Effect.asVoid);
}
