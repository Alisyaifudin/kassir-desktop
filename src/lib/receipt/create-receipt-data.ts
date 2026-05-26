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

  // // Build header section
  textData.push(...buildHeaderSection(info, record));

  // // Add separator line
  textData.push({
    size: "normal",
    kind: "line",
  });

  // // // Build products section
  textData.push(...productsTextData(products, record.fix));

  // // // Add separator line
  textData.push({
    size: "normal",
    kind: "line",
  });

  // // // Build summary section
  textData.push(...buildSummarySection(record, extras, paperWidth));

  // // // Build transaction summary (items count and payment method)
  textData.push(buildTransactionSummary(products, record));

  // // // Add empty line
  textData.push({
    size: "normal",
    kind: "linebreak",
  });

  // // // Build footer and social media section
  textData.push(...buildFooterSection(info, socials));
  return textData;
}
