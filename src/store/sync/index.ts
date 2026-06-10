import { makeLastPullAt } from "./factory";
import { token } from "./token";

export const sync = {
  token,
  method: makeLastPullAt("method-last-pull-at"),
  product: makeLastPullAt("product-last-pull-at"),
  extra: makeLastPullAt("extra-last-pull-at"),
  record: makeLastPullAt("record-last-pull-at"),
  customer: makeLastPullAt("customer-last-pull-at"),
  social: makeLastPullAt("social-last-pull-at"),
  pocket: makeLastPullAt("pocket-last-pull-at"),
};
