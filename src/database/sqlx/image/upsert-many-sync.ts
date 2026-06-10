// import { DB } from "../instance";
// import { Effect } from "effect";

// export function upsertManyImages(
//   images: {
//     id: string;
//     name: string;
//     mime: DB.Mime;
//     order: number;
//     productId: string;
//     hash?: string;
//     updatedAt: number;
//   }[],
//   now: number,
// ) {
//   let bindingIndex = 1;
//   const placeholders = images
//     .map(
//       () =>
//         `($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, 
//         $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++},
//         $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++})`,
//     )
//     .join(", ");
//   const bindings = images.flatMap(({ id, name, mime, order, productId, updatedAt, hash }) => [
//     id,
//     name,
//     mime,
//     order,
//     productId,
//     updatedAt,
//     now,
//     null,
//     hash,
//   ]);
//   return DB.execute(
//     `INSERT INTO images (image_id, image_name, image_mime,
//     image_order, product_id, image_updated_at, image_sync_at, 
//     image_deleted_at, image_hash)
//     VALUES ${placeholders} ON CONFLICT (image_id) DO UPDATE SET 
//     image_name = excluded.image_name,
//     image_mime = excluded.image_mime,
//     image_order = excluded.image_order,
//     product_id = excluded.product_id,
//     image_updated_at = excluded.image_updated_at,
//     image_sync_at = excluded.image_sync_at,
//     image_deleted_at = excluded.image_deleted_at,
//     image_hash = excluded.image_hash`,
//     bindings,
//   ).pipe(Effect.as(images.map((image) => image.id)));
// }
