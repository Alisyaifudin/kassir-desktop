import { grave } from "./grave";
import { method } from "./method";
import { product } from "./product";
import * as productEventModule from "./product-event";
import { record } from "./record";

export const sync = {
  grave,
  method,
  product,
  productEvent: productEventModule,
  record,
};
