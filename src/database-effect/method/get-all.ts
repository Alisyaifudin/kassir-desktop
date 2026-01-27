import { DB } from "../instance";
import { Effect, pipe } from "effect";

export type MethodKind = Exclude<DB.MethodEnum, "cash">;
export type Method = { id: number; kind: MethodKind; name?: string };

type Output = {
  method_id: number;
  method_name: string | null;
  method_kind: MethodKind;
};

export function getAll() {
  return pipe(
    DB.try((db) =>
      db.select<Output[]>(
        `SELECT method_id, method_kind, method_name FROM methods 
         WHERE method_deleted_at is null AND method_kind != 'cash' 
         ORDER BY method_id`,
      ),
    ),
    Effect.map((res) =>
      res.map((r) => ({
        id: r.method_id,
        kind: r.method_kind,
        name: r.method_name ?? undefined,
      })),
    ),
  );
}
