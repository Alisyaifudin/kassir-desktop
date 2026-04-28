import { add } from "./add";
import { countRecord } from "./count-record";
import { countTotal } from "./count-total";
import { delById } from "./del-by-id";
import { getByRange } from "./get-by-range";
import { getById } from "./get-by-id";
import { updateMethod } from "./update-method";
import { updateMode } from "./update-mode";
import { updateNote } from "./update-note";
import { updatePaidAt } from "./update-paid-at";
import { updatePayCredit } from "./update-pay-credit";
import { updateToCredit } from "./update-to-credit";
import { delSync } from "./del-sync";
import { addExternal } from "./add-external";
import { getDebt } from "./get-debt";
import { getUpdated } from "./get-updated";
import { updateSync } from "./update-sync";
import { addSync } from "./add-sync";
import { updateSyncAt } from "./update-sync-at";
import { getUnsync } from "./get-unsync";
import { getCountUnsync } from "./get-count-unsync";
import { updateUnsyncAll } from "./update-unsync-all";

export const record = {
  get: {
    byRange: getByRange,
    byId: getById,
    debt: getDebt,
    updated: getUpdated,
    unsync: getUnsync,
  },
  count: {
    record: countRecord,
    total: countTotal,
    unsync: getCountUnsync,
  },
  add: {
    one: add,
    sync: addSync,
    external: addExternal,
  },
  del: {
    byId: delById,
    sync: delSync,
  },
  update: {
    sync: updateSync,
    syncAt: updateSyncAt,
    unsyncAll: updateUnsyncAll,
    paidAt: updatePaidAt,
    toCredit: updateToCredit,
    payCredit: updatePayCredit,
    note: updateNote,
    mode: updateMode,
    method: updateMethod,
  },
  // upsert,
};
