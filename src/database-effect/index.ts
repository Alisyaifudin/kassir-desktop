import { cashier } from "./cashier";
import { customer } from "./customer";
import { extra } from "./extra";
import { image } from "./image";
import { method } from "./method";
import { money } from "./money";
import { product } from "./product";
import { record } from "./record";
import { recordExtra } from "./record-extra";
import { recordProduct } from "./record-product";
import { social } from "./social";

export const db = {
  customer,
  method,
  product,
  // extra,
  cashier,
  social,
  record,
  recordExtra,
  recordProduct,
  // image,
  // money
};
