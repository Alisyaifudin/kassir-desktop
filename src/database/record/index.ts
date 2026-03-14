import { add } from "./add";
import { countRecord } from "./count-record";
import { delByTimestamp } from "./del-by-timestamp";
import { getByRange } from "./get-by-range";
import { getByTimestamp } from "./get-by-timestamp";
import { updateMethod } from "./update-method";
import { updateMode } from "./update-mode";
import { updateNote } from "./update-note";
import { updatePaidAt } from "./update-paid-at";
import { updatePayCredit } from "./update-pay-credit";
import { updateToCredit } from "./update-to-credit";

export const record = {
  get: {
    byRange: getByRange,
    byTimestamp: getByTimestamp,
  },
  count: {
    record: countRecord,
  },
  add,
  delByTimestamp,
  update: {
    paidAt: updatePaidAt,
    toCredit: updateToCredit,
    payCredit: updatePayCredit,
    note: updateNote,
    mode: updateMode,
    method: updateMethod,
  },
};
