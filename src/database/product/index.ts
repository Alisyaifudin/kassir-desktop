import { delById } from "./del-by-id";
import { all } from "./get-all";
import { getById } from "./get-by-id";
import { updateInfo } from "./update-info";
import { getHistoryRange } from "./get-history-range";
import { add } from "./add";
import { getAllByRange } from "./get-all-by-range";
import { getHistoryOffset } from "./get-history-offset";
// import { upsert } from "./upsert";
import { sync } from "./update-sync";
import { addExternal } from "./add-external";
import { cache } from "./cache";
import { calcStock } from "./calc-stock";
import { getAllUpdated } from "./get-all-updated";
import { addSync } from "./add-sync";
import { getUnsync } from "./get-unsync";
import { updateSyncAt } from "./update-sync-at";
import { getCountUnsync } from "./get-count-unsync";

export const product = {
  get: {
    all,
    unsync: getUnsync,
    countUnsync: getCountUnsync,
    byId: getById,
    historyOffset: getHistoryOffset,
    historyRange: getHistoryRange,
    allRange: getAllByRange,
    updated: getAllUpdated,
  },
  del: {
    byId: delById,
  },
  update: {
    sync,
    syncAt: updateSyncAt,
    info: updateInfo,
    calcStock,
  },
  add: {
    new: add,
    external: addExternal,
    sync: addSync,
  },
  // upsert,
  revalidate: cache.revalidate,
};
