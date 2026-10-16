import { Effect } from "effect";
import { DB } from "../instance";
import { ImageFull, updateCache } from "./cache";

/** A draft the gallery wants in the db. Id and file name are already decided. */
export type DraftRow = {
  id: string;
  name: string;
  mime: DB.Mime;
};

/**
 * Commits an edit of the gallery: `drafts` are inserted as new rows and every
 * image of the product is renumbered to the position it holds in `order`
 * (1-based), in a single transaction - so the strip the user arranged is either
 * entirely in the db or not at all. A row at a time would leave a half-committed
 * batch behind if one of them failed, with the strip still saying "Belum disimpan".
 *
 * The caller writes the files before this runs (a file write cannot be rolled back
 * with the rows) and this only touches rows.
 */
export function commit(productId: string, order: string[], drafts: DraftRow[]) {
  if (order.length === 0) return Effect.void;
  const now = Date.now();
  const pending = new Map(drafts.map((draft) => [draft.id, draft]));
  const bindings: (string | number)[] = [];
  const bind = (value: string | number) => {
    bindings.push(value);
    return `$${bindings.length}`;
  };
  const queries = order.map((id, i) => {
    const draft = pending.get(id);
    if (draft === undefined) {
      return `UPDATE images SET image_order = ${bind(i + 1)}, image_sync_at = null, image_updated_at = ${bind(now)}
       WHERE image_id = ${bind(id)} AND product_id = ${bind(productId)}`;
    }
    return `INSERT INTO images (image_id, image_name, image_mime, image_order, product_id, image_updated_at, image_sync_at)
       VALUES (${bind(id)}, ${bind(draft.name)}, ${bind(draft.mime)}, ${bind(i + 1)}, ${bind(productId)}, ${bind(now)}, null)`;
  });
  return DB.try((db) =>
    db.execute(`BEGIN TRANSACTION;\n${queries.join(";\n")};\nCOMMIT;`, bindings),
  ).pipe(
    Effect.tap(() => {
      updateCache(productId, (prev) => committed(prev, productId, order, drafts, now));
    }),
    Effect.asVoid,
  );
}

/** The cached rows as `order` leaves them: renumbered, with the drafts added. */
function committed(
  prev: ImageFull[],
  productId: string,
  order: string[],
  drafts: DraftRow[],
  now: number,
): ImageFull[] {
  const pending = new Map(drafts.map((draft) => [draft.id, draft]));
  const saved = new Map(prev.map((row) => [row.id, row]));
  return order.flatMap((id, i) => {
    const position = i + 1;
    const existing = saved.get(id);
    if (existing !== undefined) {
      return [{ ...existing, order: position, updatedAt: now, syncAt: null }];
    }
    const draft = pending.get(id);
    if (draft === undefined) return [];
    return [
      {
        id: draft.id,
        name: draft.name,
        mime: draft.mime,
        order: position,
        productId,
        updatedAt: now,
        syncAt: null,
      },
    ];
  });
}
