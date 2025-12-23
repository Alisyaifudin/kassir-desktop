import { add } from "./add";
import { addNew } from "./add-new";
import { count } from "./count";
import { del } from "./del";
import { all } from "./get-all";
import { byTab } from "./get-by-tab";
import { customer } from "./update-customer";
import { extra } from "./update-extra";
import { fix } from "./update-fix";
import { methodId } from "./update-method-id";
import { mode } from "./update-mode";
import { note } from "./update-note";
import { product } from "./update-product";
import { query } from "./update-query";

export const transaction = {
  get: {
    all,
    byTab,
  },
  count,
  addNew,
  add,
  update: {
    customer,
    mode,
    query,
    fix,
    methodId,
    note,
    product,
    extra,
  },
  del,
};
