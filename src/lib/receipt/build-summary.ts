import { extrasTextData } from "./extras-text-data";
import { MAXIMAL_SUMMARY_SPACE, ReceiptData, TextData } from "./type";

export function buildSummarySection(
  record: ReceiptData["record"],
  extras: ReceiptData["extras"],
  paperWidth: number,
) {
  // Subtotal display (if different from total)
  const space = Math.min(MAXIMAL_SUMMARY_SPACE, paperWidth);
  const textData: TextData[] = [];
  if (record.subTotal !== record.total) {
    const text = `Rp${record.subTotal.toLocaleString("id-ID")}`;
    textData.push({
      text: text,
      size: "normal",
      kind: "end",
    });
  } else {
    // Regular total display
    const label = "Total";
    const text = `Rp${record.total.toLocaleString("id-ID")}`;
    textData.push({
      text: [label, text],
      size: "normal",
      kind: "spacebetween",
      x: paperWidth - space,
    });
  }

  // Extras (discounts, etc.)
  if (extras.length > 0) {
    const extraData = extrasTextData(extras, paperWidth);
    textData.push(...extraData);
    textData.push({
      size: "normal",
      kind: "line",
      x: paperWidth - space,
    });

    // Final total after extras
    const label = "Total";
    const text = `Rp${record.total.toLocaleString("id-ID")}`;
    textData.push({
      size: "normal",
      kind: "spacebetween",
      text: [label, text],
      x: paperWidth - space,
    });
  }

  // Rounding adjustments
  if (record.rounding > 0) {
    const roundingLabel = "Pembulatan";
    const sign = record.rounding > 0 ? "" : "-";
    const roundingText = `${sign}Rp${Math.abs(record.rounding).toLocaleString("id-ID")}`;
    textData.push({
      kind: "spacebetween",
      size: "normal",
      text: [roundingLabel, roundingText],
      x: paperWidth - space,
    });

    // Grand total after rounding
    const grandTotalLabel = "Total Semua";
    const grandTotalText = `Rp${record.grandTotal.toLocaleString("id-ID")}`;
    textData.push({
      text: [grandTotalLabel, grandTotalText],
      kind: "spacebetween",
      size: "normal",
      x: paperWidth - space,
    });
  }

  textData.push({
    size: "normal",
    kind: "line",
    x: paperWidth - space,
  });
  const payLabel = "Pembayaran";
  const paySign = record.pay >= 0 ? "" : "-";
  const payText = `${paySign}Rp${Math.abs(record.pay).toLocaleString("id-ID")}`;
  textData.push({
    size: "normal",
    kind: "spacebetween",
    x: paperWidth - space,
    text: [payLabel, payText],
  });
  // Change calculation
  if (record.change !== 0) {
    const changeLabel = "Kembalian";
    const sign = record.change >= 0 ? "" : "-";
    const changeText = `${sign}Rp${Math.abs(record.change).toLocaleString("id-ID")}`;
    textData.push({
      size: "normal",
      kind: "spacebetween",
      x: paperWidth - space,
      text: [changeLabel, changeText],
    });
  }
  return textData;
}
