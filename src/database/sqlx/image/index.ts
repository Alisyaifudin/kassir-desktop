import { addNewImage } from "./add";
import { deleteImageById } from "./del-by-id";
import { deleteManyImagesSync } from "./del-many-sync";
import { getImagesByProductId } from "./get-by-product-id";
import { updateSwapImageOrder } from "./update-swap";
import { updateSyncManyImages } from "./update-sync-many";
import { getAllUnsyncImages } from "./get-all-unsync";
import { getImageMaxOrder } from "./get-max-order";
import { getImageOrder } from "./get-order";
import { upsertManyImages } from "./upsert-many";
import { getImageProductId } from "./get-product-id";
import { getManyImageProductId } from "./get-many-product-id";
import { updateUnsyncAllImages } from "./update-unsync-all";

export const image = {
  get: {
    byProductId: getImagesByProductId,
    unsync: getAllUnsyncImages,
    maxOrder: getImageMaxOrder,
    order: getImageOrder,
    productId: {
      one: getImageProductId,
      many: getManyImageProductId,
    },
  },
  add: {
    one: addNewImage,
  },
  delete: {
    byId: deleteImageById,
    sync: {
      many: deleteManyImagesSync,
    },
  },
  update: {
    sync: {
      many: updateSyncManyImages,
    },
    swap: updateSwapImageOrder,
    unsync: updateUnsyncAllImages
  },
  upsert: {
    many: upsertManyImages,
  },
};
