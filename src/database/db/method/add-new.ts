import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function addNewMethod({
  name,
  label,
  kind,
}: {
  name: string;
  label: string;
  kind: Exclude<DB.MethodEnum, "cash">;
}) {
  const now = Date.now();
  return sqlx.method.add.new({ name, label, kind, now }).pipe(
    Effect.tap((id) => {
      cache.update(id, { id, name, label, kind, updatedAt: now });
    }),
  );
}
