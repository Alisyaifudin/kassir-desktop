import { ReceiptData, TextData } from "./type";
import { productsTextData } from "./product-text-data";
import { buildHeaderSection } from "./build-header";
import { buildSummarySection } from "./build-summary";
import { buildTransactionSummary } from "./build-transaction-summary";
import { buildFooterSection } from "./build-footer";

export function createReceiptData(
  { extras, products, record, info, socials }: ReceiptData,
  paperWidth: number,
): TextData[] {
  const textData: TextData[] = [];

  textData.push(...buildHeaderSection(info, record));

  textData.push({
    size: "normal",
    kind: "line",
  });

  textData.push(...productsTextData(products, record.fix));

  textData.push({
    size: "normal",
    kind: "line",
  });

  textData.push(...buildSummarySection(record, extras, paperWidth));

  textData.push(buildTransactionSummary(products, record));

  textData.push({
    size: "normal",
    kind: "linebreak",
  });

  textData.push(...buildFooterSection(info, socials));
  return textData;
}
