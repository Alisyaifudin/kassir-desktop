import { Method} from "~/database/method/cache";
import { Info } from "~/store/info/get";

export type ReceiptData = {
  record: {
    fix: number;
    id: string;
    paidAt: number;
    cashier: string;
    subtotal: number;
    total: number;
    grandTotal: number;
    change: number;
    pay: number;
    rounding: number;
    method: Method;
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

export type ReceiptOption = {
  paperWidth: number; // mm
  padding: number; // pt
  size: {
    normal: number; //pt
    big: number; //pt
  };
};

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
