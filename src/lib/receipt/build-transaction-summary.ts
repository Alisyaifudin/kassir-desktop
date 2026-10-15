import { METHOD_NAMES } from "~/lib/constants";
import { ReceiptData, TextData } from "./type";

export function buildTransactionSummary(
  products: ReceiptData["products"],
  record: ReceiptData["record"],
): TextData {
  const numOfSpecies = products.length;
  const numOfItems = products.length === 0 ? 0 : products.reduce((acc, cur) => acc + cur.qty, 0);
  const summaryNum = `${numOfSpecies} Jenis/${numOfItems} pcs`;
  // A record can carry several payments (split payment), so list them all.
  const methodName = record.methods
    .map((method) => METHOD_NAMES[method.kind] + (method.name ? ` (${method.name})` : ""))
    .join(", ");
  return {
    kind: "spacebetween",
    size: "normal",
    text: [summaryNum, methodName],
  };
}
