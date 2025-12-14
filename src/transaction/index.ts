import { clear } from "./clear";
import { discount } from "./discount";
import { extra } from "./extra";
import { product } from "./product";
import { transaction } from "./transaction";

export const tx = {
  product,
  transaction,
  extra,
  discount,
  clear,
};

export type Transaction = typeof tx;
