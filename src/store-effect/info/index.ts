import { get } from "./get";
import { setBasic } from "./set-basic";
import { setShowCashier } from "./set-show-cashier";

export const info = {
  get,
  set: {
    basic: setBasic,
    showCashier: setShowCashier,
  },
};
