import { addNewProductCode } from "./add-new";
import { deleteProductCodeByCode } from "./del-by-id";
import { deleteManyProductCodesSync } from "./del-many-sync";
import { getProductIdByCode } from "./get-product-id-by-code";
import { updateProductCode } from "./update";

export const productCode = {
  get: {
    productId: {
      byCode: getProductIdByCode,
    },
  },
  delete: {
    byCode: deleteProductCodeByCode,
    many: deleteManyProductCodesSync,
  },
  add: {
    new: addNewProductCode,
  },
  update: {
    one: updateProductCode,
  },
};
