import { ReceiptData, TextData } from "./type";

export function productsTextData(products: ReceiptData["products"], fix: number) {
  const textData: TextData[] = [];
  for (const product of products) {
    // const nameTextData = formatLongText(product.name, capacity);
    textData.push({
      kind: "long",
      text: product.name,
      size: "normal",
    });
    const price = `${Number(product.price.toFixed(fix)).toLocaleString("id-ID")} x ${product.qty}`;
    const total = Number(product.total.toFixed(fix)).toLocaleString("id-ID");
    textData.push({
      kind: "spacebetween",
      text: [price, total],
      size: "normal",
    });
    for (const discount of product.discounts) {
      const discountText = `(-${Number(discount.eff.toFixed(fix)).toLocaleString("id-ID")})`;
      switch (discount.kind) {
        case "number": {
          textData.push({
            size: "normal",
            kind: "end",
            text: discountText,
          });
          break;
        }
        case "percent": {
          const labelText = `(Diskon ${discount.value}%)`;
          textData.push({
            kind: "spacebetween",
            text: [labelText, discountText],
            size: "normal",
          });
          break;
        }
        case "pcs": {
          const labelText = `(Diskon ${discount.value}pcs)`;
          textData.push({
            kind: "spacebetween",
            text: [labelText, discountText],
            size: "normal",
          });
          break;
        }
      }
    }
    textData.push({
      size: "normal",
      kind: "linebreak",
    });
  }
  return textData;
}
