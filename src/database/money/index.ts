import { addKind } from "./add-kind";
import { addRecord } from "./add-record";
import { delByTimestamp } from "./del-by-timestamp";
import { deleteKind } from "./del-kind";
import { getAll } from "./get-all";
import { getAllKind } from "./get-all-kind";
import { getByRange } from "./get-by-range";
import { getLast } from "./get-last";
import { updateName } from "./update-name";
import { updateType } from "./update-type";

export const money = {
  get: {
    all: getAll,
    byRange: getByRange,
    allKind: getAllKind,
    last: getLast,
  },
  delete: {
    byTimestamp: delByTimestamp,
    kind: deleteKind,
  },
  add: {
    kind: addKind,
    record: addRecord,
  },
  update: {
    type: updateType,
    name: updateName,
  },
};
