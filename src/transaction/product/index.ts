import { add } from "./add";
import { delById } from "./del-by-id";
import { getByTab } from "./get-by-tab";
import { barcode } from "./update-barcode";
import { name } from "./update-name";
import { price } from "./update-price";
import { qty } from "./update-qty";

export const product = {
  add: {
    one: add,
  },
  getByTab,
  update: {
    price,
    qty,
    name,
    barcode,
  },
  delById,
};
