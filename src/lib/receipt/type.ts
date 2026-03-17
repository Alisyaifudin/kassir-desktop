import { MethodFull } from "~/database/method/get-all";
import { Info } from "~/store/info/get";

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

// type UserDefinedOption = {
//   normal_line_height: number; // mm
//   normal_font_size: number; // mm
//   big_font_size: number; // mm
//   big_line_height: number; // mm
// };

export type ReceiptOption = {
  paperWidth: number; // mm
  padding: number; // pt
  // summarySpace: number; // mm
  size: {
    normal: number; //pt
    big: number; //pt
  };
  // normal: {
  //   lineHeight: number; //pt
  //   fontSize: number; // pt
  // };
  // big: {
  //   lineHeight: number; //pt
  //   fontSize: number; // pt
  // };
};

// export const FONT_SIZE_SCALE = 1.633625;
// export const LINE_HEIHGT_SCALE = 1.633625;

// export const option: Omit<ReceiptOption, "paper_height" | "paper_width"> = {
//   normal_line_height: 2.0, // pt
//   normal_font_size: 1.4, // pt
//   big_font_size: 2.5, // pt
//   big_line_height: 3, // pt
//   padding: 2.0, // mm
//   summary_space: 40, // mm
// };

export type TextData =
  | {
      size: "normal" | "big";
      kind: "center";
      text: string;
    }
  | {
      size: "normal" | "big";
      kind: "long";
      text: string;
    }
  | {
      size: "normal" | "big";
      kind: "spacebetween";
      x?: number;
      text: [string, string];
    }
  | {
      size: "normal" | "big";
      kind: "end";
      text: string;
    }
  | {
      size: "normal" | "big";
      kind: "linebreak";
    }
  | {
      size: "normal" | "big";
      kind: "line";
      x?: number;
    };


export const MAXIMAL_SUMMARY_SPACE = 130; //pt
