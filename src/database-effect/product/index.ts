import { delById } from "./del-by-id";
import { getHistory } from "./get-history";
import { all } from "./get-all";
import { getById } from "./get-by-id";
import { updateInfo } from "./update-info";
import { getHistoryRange } from "./get-history-range";
import { add } from "./add";

export const product = {
  get: {
    all,
    byId: getById,
    history: getHistory,
    historyRange: getHistoryRange,
    // byRange: byRange,
    // performance: getPerformance,
  },
  delById,
  update: {
    info: updateInfo,
    // stock: updateStock,
  },
  // barcode: {
  //   gen: generateBarcode,
  //   propose: proposeBarcode,
  // },
  add,
};
