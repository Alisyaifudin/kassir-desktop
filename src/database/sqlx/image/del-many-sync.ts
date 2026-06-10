// import { DB } from "../instance";
// import { Effect } from "effect";

// export function deleteManyImagesSync(ids: string[], now: number) {
//   if (ids.length === 0) return Effect.void;
//   let bindingIndex = 1;
//   const queries = ids.map(
//     () =>
//       `UPDATE images SET image_deleted_at = $${bindingIndex++}, 
//       image_updated_at = $${bindingIndex++}, image_sync_at = $${bindingIndex++}
//       WHERE image_id = $${bindingIndex++};`,
//   );
//   const bindings = ids.flatMap((id) => [now, now, now, id]);
//   return DB.execute(`BEGIN TRANSACTION;${queries.join("\n")}COMMIT;`, bindings).pipe(Effect.asVoid);
// }
