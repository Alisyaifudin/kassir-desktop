import { add } from "./add";
import { delById } from "./del-by-id";
import { generateBarcode } from "./generate-barcode";
import { all } from "./get-all";
import { getById } from "./get-by-id";
import { getHistory } from "./history";
import { proposeBarcode } from "./propose-barcode";
import { updateDetail } from "./update";

export const product = {
  get: {
    all,
    byId: getById,
    history: getHistory,
  },
  delById,
  update: {
    detail: updateDetail,
  },
  barcode: {
    gen: generateBarcode,
    propose: proposeBarcode,
  },
  add,
};
