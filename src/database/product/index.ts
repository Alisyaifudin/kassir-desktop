import { delById } from "./del-by-id";
import { all } from "./get-all";
import { getById } from "./get-by-id";
import { updateInfo } from "./update-info";
import { getHistoryRange } from "./get-history-range";
import { add } from "./add";
import { getAllByRange } from "./get-all-by-range";
// import { incStock } from "./inc-stock";
// import { decStock } from "./dec-stock";
import { getHistoryOffset } from "./get-history-offset";
import { upsert } from "./upsert";
import { sync } from "./sync";
import { getAllUnsync } from "../customer/get-all-unsync";
import { addExternal } from "./add-external";
import { cache } from "./cache";
import { updateStock } from "./update-stock";
import { calcStock } from "./calc-stock";

export const product = {
  get: {
    all,
    unsync: getAllUnsync,
    byId: getById,
    historyOffset: getHistoryOffset,
    historyRange: getHistoryRange,
    allRange: getAllByRange,
  },
  del: {
    byId: delById,
  },
  update: {
    sync,
    info: updateInfo,
    stock: updateStock,
    calcStock,
    // stock: {
    //   inc: incStock,
    //   dec: decStock,
    // },
  },
  add: {
    new: add,
    external: addExternal,
  },
  upsert,
  revalidate: cache.revalidate,
};
