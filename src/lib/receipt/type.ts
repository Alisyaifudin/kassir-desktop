import type { Info } from "~/services/info";
import type { Record, RecordExtra, RecordListing } from "~/services/record";
import type { Social } from "~/services/social";

/**
 * Everything a receipt draws on. Fields left out are the ones the app no longer
 * carries: `record.subtotal` is the service's `subTotal`, and the receipt prints
 * the domain types themselves rather than a parallel shape to keep in step.
 */
export type ReceiptData = {
  record: Record;
  products: RecordListing[];
  extras: RecordExtra[];
  info: Info;
  socials: Social[];
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
