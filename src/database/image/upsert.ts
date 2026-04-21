// import { DB } from "../instance";
// import { Effect } from "effect";
// import { ImageFull, updateCache } from "./cache";
// import { produce } from "immer";

// export function upsert({
//   name,
//   id,
//   order,
//   updatedAt,
//   mime,
//   productId,
// }: Omit<ImageFull, "syncAt">) {
//   const now = Date.now();
//   return Effect.gen(function* () {
//     yield* DB.try((db) =>
//       db.execute(
//         `INSERT INTO images (image_id, image_name, image_mime, image_order, product_id, 
//          image_updated_at, image_sync_at) 
//          VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (image_id) DO UPDATE SET
//          image_name = excluded.image_name,
//          image_mime = excluded.image_mime,
//          image_order = excluded.image_order,
//          product_id = excluded.product_id,
//          image_updated_at = excluded.image_updated_at,
//          image_sync_at = excluded.image_sync_at`,
//         [id, name, mime, productId, order, updatedAt, now],
//       ),
//     );
//     updateCache(
//       productId,
//       produce((draft) => {
//         const idx = draft.findIndex((d) => d.id === id);
//         if (idx === -1) {
//           draft.push({
//             id,
//             mime,
//             name,
//             productId,
//             syncAt: now,
//             order,
//             updatedAt,
//           });
//           return;
//         }
//         draft[idx] = {
//           id,
//           name,
//           mime,
//           order,
//           updatedAt,
//           productId,
//           syncAt: now,
//         };
//       }),
//     );
//     return id;
//   });
// }
