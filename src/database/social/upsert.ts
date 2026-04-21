// import { Effect } from "effect";
// import { DB } from "../instance";
// import { cache } from "./cache";

// export function upsert({
//   name,
//   value,
//   updatedAt,
//   id,
// }: {
//   name: string;
//   value: string;
//   updatedAt: number;
//   id: string;
// }) {
//   const now = Date.now();
//   return DB.try((db) =>
//     db.execute(
//       `INSERT INTO socials (social_id, social_name, social_value, 
//        social_updated_at, social_sync_at) VALUES ($1, $2, $3, $4, $5)
//        ON CONFLICT(social_id) DO UPDATE SET
//        social_name = excluded.social_name,
//        social_value = excluded.social_value,
//        social_updated_at = excluded.social_updated_at,
//        social_sync_at = excluded.social_sync_at`,
//       [id, name, value, updatedAt, now],
//     ),
//   ).pipe(
//     Effect.tap(() => {
//       cache.update(id, {
//         id,
//         name,
//         value,
//         syncAt: now,
//         updatedAt,
//       });
//     }),
//     Effect.asVoid,
//   );
// }
