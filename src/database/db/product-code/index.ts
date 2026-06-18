import { deleteManyProductCodesSync } from "~/database/sqlx/product-code/del-many-sync";
import { addNewProductCode } from "./add-new";
import { updateProductCode } from "./update";
import { deleteProductCodeByCode } from "~/database/sqlx/product-code/del-by-id";

export const productCode = {
  delete: {
    byCode: deleteProductCodeByCode,
  },
  add: {
    new: addNewProductCode,
  },
  update: {
    one: updateProductCode,
  },
  sync: {
    delete: {
      many: deleteManyProductCodesSync,
    },
  },
};
