import { addNewImage } from "./add-new";
import { deleteImageById } from "./del-by-id";
import { getImagesByProductId } from "./get-by-product-id";
import { getImageMaxOrder } from "./get-max-order";
import { getImageOrder } from "./get-order";
import { getProductIdByImageId } from "./get-product-id";
import { getManyProductIdsByImageIds } from "./get-many-product-id";
import { updateSwapImageOrder } from "./update-swap";

export const image = {
  get: {
    byProductId: getImagesByProductId,
    maxOrder: getImageMaxOrder,
    order: getImageOrder,
    productId: {
      one: getProductIdByImageId,
      many: getManyProductIdsByImageIds,
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
  },
};
