import { add } from "./add";
import { addExternal } from "./add-external-old";
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
import { upsert } from "./upsert";

export const record = {
  get: {
    byRange: getByRange,
    byId: getById,
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
  upsert,
};
