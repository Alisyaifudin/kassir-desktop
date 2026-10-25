import { ReceiptData, TextData } from "./type";
import { capitalize } from "../utils";
import { formatDate, formatTime } from "../date";

export function buildHeaderSection(info: ReceiptData["info"], record: ReceiptData["record"]) {
  const ownerTextData: TextData = {
    kind: "center",
    size: "big",
    text: info.owner,
  };

  const headerTextData: TextData = {
    size: "normal",
    kind: "center",
    text: info.header,
  };

  const addressTextData: TextData = {
    size: "normal",
    kind: "long",
    text: info.address,
  };
  const textData: TextData[] = [ownerTextData, headerTextData, addressTextData];
  // Order number
  const orderNo = "No: " + record.id;
  textData.push({
    kind: "long",
    text: orderNo,
    size: "normal",
  });
  // A credit (utang) record has no `paidAt` yet: print the credit date and say
  // so, instead of dating the receipt as if it had been settled.
  const printedAt = record.paidAt ?? record.creditAt ?? record.createdAt;
  const datetime =
    (record.paidAt === null ? "Kredit " : "") +
    formatDate(printedAt, "short") +
    ", " +
    formatTime(printedAt, "short");
  // Cashier info (if enabled) and datetime
  if (info.showCashier) {
    const cashier = "Kasir: " + capitalize(record.cashier);
    textData.push({
      kind: "spacebetween",
      size: "normal",
      text: [cashier, datetime],
    });
  } else {
    textData.push({
      kind: "end",
      text: datetime,
      size: "normal",
    });
  }

  return textData;
}
