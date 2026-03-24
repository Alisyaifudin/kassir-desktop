import { delById } from "./del-by-id";
import { all } from "./get-all";
import { getById } from "./get-by-id";
import { updateInfo } from "./update-info";
import { getHistoryRange } from "./get-history-range";
import { add } from "./add";
import { getAllByRange } from "./get-all-by-range";
import { incStock } from "./inc-stock";
import { decStock } from "./dec-stock";
import { getHistoryBefore } from "./get-history-before";
import { upsert } from "./upsert";
import { sync } from "./sync";
import { getAllUnsync } from "../customer/get-all-unsync";

export const product = {
  get: {
    all,
    unsync: getAllUnsync,
    byId: getById,
    historyBefore: getHistoryBefore,
    historyRange: getHistoryRange,
    allRange: getAllByRange,
  },
  del: {
    byId: delById,
  },
  update: {
    sync,
    info: updateInfo,
    stock: {
      inc: incStock,
      dec: decStock,
    },
  },
  add,
  upsert,
};
