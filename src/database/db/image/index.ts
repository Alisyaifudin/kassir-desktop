import { addNewImage } from "./add";
import { upsertManyImages } from "./upsert-many";
import { deleteImageById } from "./del-by-id";
import { deleteManyImagesSync } from "./del-many-sync";
import { getImagesByProductId } from "./get-by-product-id";
import { updateSwapImage } from "./update-swap";
import { updateSyncManyImages } from "./update-sync-many";
import { getAllUnsyncImages } from "./get-all-unsync";
import { revalidateCache } from "./cache";

export const image = {
  get: {
    byProductId: getImagesByProductId,
    unsync: getAllUnsyncImages,
  },
  add: {
    one: addNewImage,
  },
  delete: {
    byId: deleteImageById,
    sync: deleteManyImagesSync,
  },
  update: {
    sync: updateSyncManyImages,
    swap: updateSwapImage,
  },
  upsert: {
    many: upsertManyImages,
  },
  revalidate: revalidateCache,
};
