import { getAllUnsyncRecords } from "./get-all-unsync";
import { getRecordById } from "./get-by-id";
import { updateProduct } from "./update";
import { updateManyProductsSyncAt } from "./update-many-sync-at";
import { updateUnsyncAllProducts } from "./update-unsync-all";
import { upsertProductsSync } from "./upsert-sync";

export const record = {
  get: {
    allUnsync: getAllUnsyncRecords,
    byId: getRecordById,
  },
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
