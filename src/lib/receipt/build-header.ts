import { Info } from "~/store/info/get";
import { ReceiptData, TextData } from "./type";
import { capitalize } from "../utils";
import { formatDate, formatTime } from "../date";

export function buildHeaderSection(info: Info, record: ReceiptData["record"]) {
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
  // Cashier info (if enabled)
  if (info.showCashier) {
    const cashier = "Kasir: " + capitalize(record.cashier);
    textData.push({
      text: cashier,
      size: "normal",
      kind: "long",
    });
  }

  // Order number and date
  const orderNo = "No: " + record.timestamp.toString();
  const datetime = formatDate(record.paidAt, "short") + ", " + formatTime(record.paidAt, "short");
  textData.push({
    kind: "spacebetween",
    text: [orderNo, datetime],
    size: "normal",
  });
  return textData;
}
