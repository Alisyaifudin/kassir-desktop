import { addNewImage } from "./add-new";
import { cache } from "./cache";
import { deleteImageById } from "./del-by-id";
import { getImagesByProductId } from "./get-by-product-id";
import { updateSwapImage } from "./update-swap";

export const image = {
  get: {
    byProductId: getImagesByProductId,
  },
  add: {
    new: addNewImage,
  },
  delete: {
    byId: deleteImageById,
  },
  update: {
    swap: updateSwapImage,
  },
  revalidate: cache.revalidate,
};
