import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

type Input = {
  name: string;
  value: number;
  kind: DB.ValueKind;
  now: number;
};

export function addNewExtra({ name, value, kind, now }: Input) {
  return sqlx.extra.add.new({ name, value, kind, now }).pipe(
    Effect.tap((id) => {
      cache.update(id, { id, name, value, kind, updatedAt: now });
    }),
  );
}
