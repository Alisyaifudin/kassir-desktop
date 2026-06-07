import { addNewImage } from "./add-new";
import { cache } from "./cache";
import { deleteImageById } from "./del-by-id";
import { deleteManyImagesSync } from "./del-many-sync";
import { getUnsyncImagesAfter } from "./get-after";
import { getImagesByProductId } from "./get-by-product-id";
import { updateSwapImage } from "./update-swap";
import { updateSyncManyImages } from "./update-sync-many";
import { updateUnsyncAllImages } from "./update-unsync-all";
import { upsertManyImages } from "./upsert-many-sync";

export const image = {
  get: {
    byProductId: getImagesByProductId,
    unsync: {
      after: getUnsyncImagesAfter,
    },
  },
  add: {
    new: addNewImage,
  },
  delete: {
    byId: deleteImageById,
  },
  update: {
    swap: updateSwapImage,
    unsyncAll: updateUnsyncAllImages,
  },
  sync: {
    delete: {
      many: deleteManyImagesSync,
    },
    update: {
      many: {
        syncAt: updateSyncManyImages,
      },
    },
    upsert: {
      many: upsertManyImages,
    },
  },
  revalidate: cache.revalidate,
};
