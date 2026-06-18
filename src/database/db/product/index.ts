import { addNewProduct } from "./add-new";
import { deleteProductById } from "./del-by-id";
import { deleteManyProductsSync } from "./del-many-sync";
import { updateProduct } from "./update";
import { updateManyProductsSyncAt } from "./update-many-sync-at";
import { updateUnsyncAllProducts } from "./update-unsync-all";
import { upsertProductsSync } from "./upsert-sync";

export const product = {
  update: {
    one: updateProduct,
    allUnsync: updateUnsyncAllProducts,
  },
  delete: {
    byId: deleteProductById,
  },
  add: {
    new: addNewProduct,
  },
  sync: {
    delete: {
      many: deleteManyProductsSync,
    },
    update: {
      many: {
        syncAt: updateManyProductsSyncAt,
      },
    },
    upsert: {
      one: upsertProductsSync,
    },
  },
};
