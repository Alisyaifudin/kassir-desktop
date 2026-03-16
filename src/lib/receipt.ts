import { TextData, UserDefinedOption } from "./printer";
import { Info } from "~/store/info/get";
import { formatDate, formatTime } from "./date";
import { MethodFull } from "~/database/method/get-all";

export type ReceiptData = {
  record: {
    fix: number;
    timestamp: number;
    paidAt: number;
    cashier: string;
    subTotal: number;
    total: number;
    grandTotal: number;
    change: number;
    pay: number;
    rounding: number;
    method: MethodFull;
  };
  products: {
    name: string;
    price: number;
    qty: number;
    total: number;
    discounts: {
      kind: DB.DiscKind;
      value: number;
      eff: number;
    }[];
  }[];
  extras: {
    name: string;
    eff: number;
    value: number;
    kind: DB.ValueKind;
  }[];
  info: Info;
  socials: {
    name: string;
    value: string;
  }[];
};

type Option = UserDefinedOption & {
  paper_width: number; // mm
  padding: number; // mm
  summary_space: number; // mm
};

export const FONT_SIZE_SCALE = 1.633625;
export const LINE_HEIHGT_SCALE = 1.633625;

export const option: Omit<Option, "paper_height" | "paper_width"> = {
  normal_line_height: 3.0, // mm
  normal_font_size: 2.0, // mm
  big_font_size: 3.0, // mm
  big_line_height: 4.0, // mm
  padding: 2.0, // mm
  summary_space: 50, //mm
};

function getHorizontalCapacity({
  padding,
  paperWidth,
  fontSize,
}: {
  paperWidth: number;
  padding: number;
  fontSize: number;
}) {
  return Math.floor((paperWidth - padding * 2) / fontSize);
}

export function createReceipt(
  { extras, products, record, info, socials }: ReceiptData,
  option: Omit<Option, "paper_height">,
) {
  const capacityNormalHorizontal = getHorizontalCapacity({
    padding: option.padding,
    paperWidth: option.paper_width,
    fontSize: option.normal_font_size,
  });
  const capacityBigHorizontal = getHorizontalCapacity({
    padding: option.padding,
    paperWidth: option.paper_width,
    fontSize: option.big_font_size,
  });

  const textData: TextData[] = [];

  // Build header section
  buildHeaderSection(textData, info, record, capacityNormalHorizontal, capacityBigHorizontal);

  // Add separator line
  textData.push({
    text: "-".repeat(capacityNormalHorizontal),
    size: "Normal",
  });

  // Build products section
  buildProductsSection(textData, products, capacityNormalHorizontal, record.fix);

  // Add separator line
  textData.push({
    text: "-".repeat(capacityNormalHorizontal),
    size: "Normal",
  });

  // Build summary section
  const summarySpace = Math.min(
    option.summary_space / option.normal_font_size,
    capacityNormalHorizontal,
  );
  const spacePadding = " ".repeat(Math.max(0, capacityNormalHorizontal - summarySpace));

  buildSummarySection(textData, record, extras, summarySpace, spacePadding);

  // Build transaction summary (items count and payment method)
  buildTransactionSummary(textData, products, record, capacityNormalHorizontal);

  // Add empty line
  textData.push({
    text: "",
    size: "Normal",
  });

  // Build footer and social media section
  buildFooterSection(textData, info, socials, capacityNormalHorizontal);

  const paperHeight =
    (textData.length - 1) * option.normal_line_height * LINE_HEIHGT_SCALE +
    2 * option.padding +
    option.big_line_height * LINE_HEIHGT_SCALE;

  textData[0].position = {
    x: option.padding,
    y: paperHeight - option.padding - option.big_line_height,
  };
  return { textData, paperHeight };
}

const methodLabel = {
  cash: "Tunai",
  transfer: "Transfer",
  debit: "Debit",
  qris: "QRIS",
} as const;

function buildHeaderSection(
  textData: TextData[],
  info: Info,
  record: ReceiptData["record"],
  capacityNormal: number,
  capacityBig: number,
) {
  // Owner name (centered)
  const ownerName = info.owner.slice(0, capacityBig);
  const ownerSpace = " ".repeat(Math.max(0, capacityBig - ownerName.length) / 2);
  textData.push({
    text: ownerSpace + ownerName + ownerSpace,
    size: "Big",
  });

  // Header text (centered)
  const headerText = info.header.slice(0, capacityNormal);
  const headerSpace = " ".repeat(Math.max(0, capacityNormal - headerText.length) / 2);
  textData.push({
    text: headerSpace + headerText + headerSpace,
    size: "Normal",
  });

  // Address (formatted)
  const addressTextData = formatLongText(info.address, capacityNormal);
  textData.push(...addressTextData);

  // Cashier info (if enabled)
  if (info.showCashier) {
    const cashier = "Kasir: " + record.cashier;
    textData.push({
      text: cashier.slice(0, capacityNormal),
      size: "Normal",
    });
  }

  // Order number and date
  const orderNo = "No: " + record.timestamp.toString();
  const date = formatDate(record.paidAt, "short") + ", " + formatTime(record.paidAt, "short");
  const orderNoAndDateLength = (orderNo + date).length;

  if (orderNoAndDateLength > capacityNormal) {
    textData.push({
      text: orderNo,
      size: "Normal",
    });
    textData.push({
      text: date,
      size: "Normal",
    });
  } else {
    const spaceBetweenOrderNoAndDate = " ".repeat(
      Math.max(0, capacityNormal - orderNo.length - date.length),
    );
    textData.push({
      text: orderNo + spaceBetweenOrderNoAndDate + date,
      size: "Normal",
    });
  }
}

function buildProductsSection(
  textData: TextData[],
  products: ReceiptData["products"],
  capacity: number,
  fix: number,
) {
  const productData = productsTextData(products, capacity, fix);
  textData.push(...productData);
}

function buildSummarySection(
  textData: TextData[],
  record: ReceiptData["record"],
  extras: ReceiptData["extras"],
  summarySpace: number,
  spacePadding: string,
) {
  // Subtotal display (if different from total)
  if (record.subTotal !== record.total) {
    const text = `Rp${record.subTotal.toLocaleString("id-ID")}`;
    const space = " ".repeat(Math.max(0, summarySpace - text.length));
    textData.push({
      text: space + text,
      size: "Normal",
    });
  } else {
    // Regular total display
    const label = "Total";
    const text = `Rp${record.total.toLocaleString("id-ID")}`;
    const spaceBetween = " ".repeat(Math.max(0, summarySpace - label.length - text.length));
    textData.push({
      text: spacePadding + label + spaceBetween + text,
      size: "Normal",
    });
  }

  // Extras (discounts, etc.)
  if (extras.length > 0) {
    const extraData = extrasTextData(extras, summarySpace, spacePadding);
    textData.push(...extraData);
    textData.push({
      text: spacePadding + "-".repeat(summarySpace),
      size: "Normal",
    });

    // Final total after extras
    const label = "Total";
    const text = `Rp${record.total.toLocaleString("id-ID")}`;
    const spaceBetween = " ".repeat(Math.max(0, summarySpace - label.length - text.length));
    textData.push({
      text: spacePadding + label + spaceBetween + text,
      size: "Normal",
    });
  }

  // Rounding adjustments
  if (record.rounding > 0) {
    const roundingLabel = "Pembulatan";
    const sign = record.rounding > 0 ? "" : "-";
    const roundingText = `${sign}Rp${record.rounding.toLocaleString("id-ID")}`;
    const roundingSpaceBetween = " ".repeat(
      Math.max(0, summarySpace - roundingLabel.length - roundingText.length),
    );
    textData.push({
      text: spacePadding + roundingLabel + roundingSpaceBetween + sign + roundingText,
      size: "Normal",
    });

    // Grand total after rounding
    const grandTotalLabel = "Total Semua";
    const grandTotalText = `Rp${record.grandTotal.toLocaleString("id-ID")}`;
    const grandTotalSpaceBetween = " ".repeat(
      Math.max(0, summarySpace - grandTotalLabel.length - grandTotalText.length),
    );
    textData.push({
      text: spacePadding + grandTotalLabel + grandTotalSpaceBetween + grandTotalText,
      size: "Normal",
    });
  }

  // Change calculation
  if (record.change !== 0) {
    textData.push({
      text: spacePadding + "-".repeat(summarySpace),
      size: "Normal",
    });

    const changeLabel = "Kembalian";
    const sign = record.change > 0 ? "" : "-";
    const changeText = `${sign}Rp${record.change.toLocaleString("id-ID")}`;
    const changeSpaceBetween = " ".repeat(
      Math.max(0, summarySpace - changeLabel.length - changeText.length),
    );
    textData.push({
      text: spacePadding + changeLabel + changeSpaceBetween + sign + changeText,
      size: "Normal",
    });
  }
}

function buildTransactionSummary(
  textData: TextData[],
  products: ReceiptData["products"],
  record: ReceiptData["record"],
  capacity: number,
) {
  const numOfSpecies = products.length;
  const numOfItems = products.length === 0 ? 0 : products.reduce((acc, cur) => acc + cur.qty, 0);
  const summaryNum = `${numOfSpecies} Jenis/${numOfItems} pcs`;
  const methodName =
    methodLabel[record.method.kind] + (record.method.name ? ` (${record.method.name})` : "");
  const spaceBetweenMethodNameAndNumOfSpecies = " ".repeat(
    Math.max(2, capacity - methodName.length - summaryNum.length),
  );
  textData.push({
    text: summaryNum + spaceBetweenMethodNameAndNumOfSpecies + methodName,
    size: "Normal",
  });
}

function buildFooterSection(
  textData: TextData[],
  info: Info,
  socials: ReceiptData["socials"],
  capacity: number,
) {
  const footerText = formatLongText(info.footer, capacity);
  textData.push(...footerText);

  for (const social of socials) {
    const text = `${social.name}: ${social.value}`;
    const data = formatLongText(text, capacity);
    textData.push(...data);
  }
}

function formatLongText(raw: string, capacity: number): TextData[] {
  const textData: TextData[] = [];
  if (raw.trim() === "") return textData;

  const paragraphs = raw.split("\n");
  for (const paragraph of paragraphs) {
    let text = paragraph.trim();

    while (text.length > 0) {
      if (text.length <= capacity) {
        // Entire remaining text fits on one line
        textData.push({
          text: text,
          size: "Normal",
        });
        break;
      }

      // Check if we're at a space boundary
      if (text[capacity] === " ") {
        // Perfect space boundary, split cleanly
        const line = text.slice(0, capacity).trim();
        textData.push({
          text: line,
          size: "Normal",
        });
        text = text.slice(capacity + 1); // Skip the space
      } else if (text[capacity - 1] === " ") {
        // Space before the boundary, split cleanly
        const line = text.slice(0, capacity - 1).trim();
        textData.push({
          text: line,
          size: "Normal",
        });
        text = text.slice(capacity);
      } else {
        // We're in the middle of a word, find the last space
        let splitIndex = capacity;
        while (splitIndex > 0 && text[splitIndex] !== " ") {
          splitIndex--;
        }

        if (splitIndex > 0) {
          // Found a space, split cleanly
          const line = text.slice(0, splitIndex).trim();
          textData.push({
            text: line,
            size: "Normal",
          });
          text = text.slice(splitIndex + 1); // Skip the space
        } else {
          // No space found, split with hyphen
          splitIndex = capacity - 1;
          const line = text.slice(0, splitIndex) + "-";
          textData.push({
            text: line,
            size: "Normal",
          });
          text = text.slice(splitIndex);
        }
      }
    }
  }

  return textData;
}

function productsTextData(products: ReceiptData["products"], capacity: number, fix: number) {
  const textData: TextData[] = [];
  for (const product of products) {
    const nameTextData = formatLongText(product.name, capacity);
    textData.push(...nameTextData);
    const price = `${Number(product.price.toFixed(fix)).toLocaleString("id-ID")} x ${product.qty}`;
    const total = Number(product.total.toFixed(fix)).toLocaleString("id-ID");
    const spaceBetweenPriceAndTotal = " ".repeat(
      Math.max(2, capacity - price.length - total.length),
    );
    textData.push({
      text: price + spaceBetweenPriceAndTotal + total,
      size: "Normal",
    });
    for (const discount of product.discounts) {
      const discountText = `(-${Number(discount.eff.toFixed(fix)).toLocaleString("id-ID")})`;
      switch (discount.kind) {
        case "number": {
          const space = " ".repeat(Math.max(0, capacity - discountText.length));
          textData.push({
            text: space + discountText,
            size: "Normal",
          });
          break;
        }
        case "percent": {
          const labelText = `(Diskon ${discount.value}%)`;
          const space = " ".repeat(Math.max(2, capacity - discountText.length - labelText.length));
          textData.push({
            text: labelText + space + discountText,
            size: "Normal",
          });
          break;
        }
        case "pcs": {
          const labelText = `(Diskon ${discount.value}pcs)`;
          const space = " ".repeat(Math.max(2, capacity - discountText.length - labelText.length));
          textData.push({
            text: labelText + space + discountText,
            size: "Normal",
          });
          break;
        }
      }
    }
    textData.push({
      text: "",
      size: "Normal",
    });
  }
  return textData;
}

function extrasTextData(extras: ReceiptData["extras"], summarySpace: number, spacePadding: string) {
  const textData: TextData[] = [];
  for (const extra of extras) {
    const sign = extra.eff > 0 ? "" : "-";
    const value = sign + "Rp" + Math.abs(extra.eff).toLocaleString("id-ID");
    const remainingSpace = summarySpace - value.length;
    let label = "";
    switch (extra.kind) {
      case "number": {
        label = "Diskon".slice(0, remainingSpace);
        break;
      }
      case "percent": {
        label = `Diskon ${extra.value}%`;
        if (label.length > remainingSpace) {
          label = `Disk ${extra.value}%`;
        }
        if (label.length > remainingSpace) {
          label = "Diskon".slice(0, remainingSpace);
        }
        break;
      }
    }
    const space = " ".repeat(Math.max(2, remainingSpace - label.length));
    textData.push({
      text: spacePadding + label + space + value,
      size: "Normal",
    });
  }
  return textData;
}
