import { Info } from "~/store/info/get";
import { ReceiptData, TextData } from "./type";

export function buildFooterSection(info: Info, socials: ReceiptData["socials"]) {
  const textData: TextData[] = [];

  const footers = info.footer.split("\n");
  for (const footer of footers) {
    textData.push({
      kind: "center",
      text: footer,
      size: "normal",
    });
  }

  for (const social of socials) {
    const text = `${social.name}: ${social.value}`;
    textData.push({
      kind: "long",
      size: "normal",
      text,
    });
  }
  return textData;
}
