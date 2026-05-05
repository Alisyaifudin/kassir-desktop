import { generateId } from "~/lib/random";
import { RecordType } from "./type";

export function insertExtras({
  extras,
  recordId,
  bind,
}: {
  extras: RecordType.Extra[];
  recordId: string;
  bind: {
    index: number;
    values: (number | string | null)[];
  };
}) {
  if (extras.length === 0) return "";
  const placeholders = extras
    .map(
      () =>
        `($${bind.index++}, $${bind.index++}, $${bind.index++}, 
         $${bind.index++}, $${bind.index++}, $${bind.index++})`,
    )
    .join(", ");
  let query = `INSERT INTO record_extras (record_extra_id, record_extra_name, record_id, 
    record_extra_value, record_extra_eff, record_extra_kind)
    VALUES ${placeholders};\n`;
  for (const extra of extras) {
    bind.values.push(generateId(), extra.name, recordId, extra.value, extra.eff, extra.kind);
  }
  return query;
}
