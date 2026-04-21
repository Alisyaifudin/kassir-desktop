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
// import { upsert } from "./upsert";
import { addExternal } from "./add-external";
import { getDebt } from "./get-debt";

export const record = {
  get: {
    byRange: getByRange,
    byId: getById,
    debt: getDebt,
  },
  count: {
    record: countRecord,
    total: countTotal,
  },
  add: {
    one: add,
    external: addExternal,
  },
  del: {
    byId: delById,
    sync: delSync,
  },
  update: {
    paidAt: updatePaidAt,
    toCredit: updateToCredit,
    payCredit: updatePayCredit,
    note: updateNote,
    mode: updateMode,
    method: updateMethod,
  },
  // upsert,
};
