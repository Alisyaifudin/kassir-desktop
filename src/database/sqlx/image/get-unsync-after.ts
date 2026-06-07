import { DB } from "../instance";
import { Effect } from "effect";

type ExistImage = {
  id: string;
  name: string;
  mime: DB.Mime;
  order: number;
  productId: string;
  hash: string | undefined;
  updatedAt: number;
};

type DeletedImage = {
  id: string;
  deletedAt: number;
  updatedAt: number;
};

type GetAfterResult = {
  exist: ExistImage[];
  deleted: DeletedImage[];
};

export function getUnsyncImagesAfter(timestamp: number) {
  return DB.select<DB.Image[]>(
    "SELECT * FROM images WHERE image_updated_at > $1 AND image_sync_at IS NULL",
    [timestamp],
  ).pipe(
    Effect.map((res) =>
      res.reduce<GetAfterResult>(
        (acc, r) => {
          if (r.image_deleted_at === null) {
            acc.exist.push({
              id: r.image_id,
              name: r.image_name,
              mime: r.image_mime,
              order: r.image_order,
              productId: r.product_id,
              hash: r.image_hash ?? undefined,
              updatedAt: r.image_updated_at,
            });
          } else {
            acc.deleted.push({
              id: r.image_id,
              deletedAt: r.image_deleted_at,
              updatedAt: r.image_updated_at,
            });
          }
          return acc;
        },
        { exist: [], deleted: [] },
      ),
    ),
  );
}
