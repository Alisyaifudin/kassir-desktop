import { info } from "./info";
import { method } from "./method";
import { owner } from "./owner";
import { size } from "./size";
import { usePrinterStore } from "./printer";

export const store = {
  size,
  owner,
  info,
  method,
  printer: usePrinterStore,
};
