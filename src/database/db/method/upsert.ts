// import { cache } from "./cache";
// import { sqlx } from "~/database/sqlx";
// import { Effect } from "effect";

// export function upsert({ id, name, kind, updatedAt }: { id: string; name?: string; kind: DB.MethodEnum; updatedAt: number }) {
//   const now = Date.now();
//   return sqlx.method.upsert(id, name ?? null, kind, updatedAt, now).pipe(
//     Effect.tap(() => {
//       cache.update(id, { id, name, kind, deletedAt: null, updatedAt, syncAt: now });
//     }),
//   );
// }
