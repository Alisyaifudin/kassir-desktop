import { delById } from "./del-by-id";
import { getHistory } from "./get-history";
import { all } from "./get-all";
import { getById } from "./get-by-id";
import { updateInfo } from "./update-info";
import { getHistoryRange } from "./get-history-range";
import { add } from "./add";
import { getByRange } from "./get-by-range";
import { incStock } from "./inc-stock";
import { decStock } from "./dec-stock";
import { allFull } from "./get-all-full";

export const product = {
  get: {
    all,
    allFull,
    byId: getById,
    history: getHistory,
    historyRange: getHistoryRange,
    byRange: getByRange,
    // performance: getPerformance,
  },
  delById,
  update: {
    info: updateInfo,
    stock: {
      inc: incStock,
      dec: decStock,
    },
    // stock: updateStock,
  },
  // barcode: {
  //   gen: generateBarcode,
  //   propose: proposeBarcode,
  // },
  add,
};
