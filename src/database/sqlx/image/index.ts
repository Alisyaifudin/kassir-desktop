import { addNewImage } from "./add-new";
import { deleteImageById } from "./del-by-id";
import { deleteManyImagesSync } from "./del-many-sync";
import { getUnsyncImagesAfter } from "./get-unsync-after";
import { getImagesByProductId } from "./get-by-product-id";
import { getImageMaxOrder } from "./get-max-order";
import { getImageOrder } from "./get-order";
import { getImageProductId } from "./get-product-id";
import { getManyImagesProductId } from "./get-many-product-id";
import { updateSwapImageOrder } from "./update-swap";
import { updateManyImagesSyncAt } from "./update-many-sync-at";
import { updateUnsyncAllImages } from "./update-unsync-all";
import { upsertManyImages } from "./upsert-many-sync";

export const image = {
  get: {
    byProductId: getImagesByProductId,
    unsync: {
      after: getUnsyncImagesAfter,
    },
    maxOrder: getImageMaxOrder,
    order: getImageOrder,
    productId: {
      one: getImageProductId,
      many: getManyImagesProductId,
    },
  },
  add: {
    new: addNewImage,
  },
  delete: {
    byId: deleteImageById,
  },
  update: {
    swap: updateSwapImageOrder,
    unsyncAll: updateUnsyncAllImages,
  },
  sync: {
    delete: {
      many: deleteManyImagesSync,
    },
    update: {
      many: {
        syncAt: updateManyImagesSyncAt,
      },
    },
    upsert: {
      many: upsertManyImages,
    },
  },
};
