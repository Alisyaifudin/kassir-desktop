import { ReceiptData, TextData } from "./type";

const methodLabel = {
  cash: "Tunai",
  transfer: "Transfer",
  debit: "Debit",
  qris: "QRIS",
} as const;

export function buildTransactionSummary(
  products: ReceiptData["products"],
  record: ReceiptData["record"],
): TextData {
  const numOfSpecies = products.length;
  const numOfItems = products.length === 0 ? 0 : products.reduce((acc, cur) => acc + cur.qty, 0);
  const summaryNum = `${numOfSpecies} Jenis/${numOfItems} pcs`;
  const methodName =
    methodLabel[record.method.kind] + (record.method.name ? ` (${record.method.name})` : "");
  return {
    kind: "spacebetween",
    size: "normal",
    text: [summaryNum, methodName],
  };
}
