import { MAXIMAL_SUMMARY_SPACE, ReceiptData, TextData } from "./type";

export function extrasTextData(extras: ReceiptData["extras"], paperWidth: number) {
  const textData: TextData[] = [];
  for (const extra of extras) {
    const sign = extra.eff > 0 ? "" : "-";
    const value = sign + "Rp" + Math.abs(extra.eff).toLocaleString("id-ID");
    let label = "";
    switch (extra.kind) {
      case "number": {
        label = extra.name;
        break;
      }
      case "percent": {
        label = `${extra.name} ${extra.value}%`;
        break;
      }
    }
    const space = Math.min(MAXIMAL_SUMMARY_SPACE, paperWidth);
    textData.push({
      text: [label, value],
      size: "normal",
      kind: "spacebetween",
      x: paperWidth - space,
    });
  }
  return textData;
}
