import { Effect } from "effect";
import { createReceiptData } from "./create-receipt-data";
import { ReceiptOption, ReceiptData, TextData } from "./type";
import { PDFDocument, PDFFont, rgb } from "pdf-lib";
import robotoRegularRaw from "~/assets/fonts/Roboto-Regular.ttf?arraybuffer";
import robotoBoldRaw from "~/assets/fonts/Roboto-Bold.ttf?arraybuffer";
import fontkit from "@pdf-lib/fontkit";

const PT_IN_MM = 2.83466666667; // pt/mm
const MINIMAL_GAP = 5;
const BLACK = rgb(0, 0, 0);

type StyleConfig = {
  big: {
    lineHeight: number;
    size: number;
    font: PDFFont;
  };
  normal: {
    lineHeight: number;
    size: number;
    font: PDFFont;
  };
};

/**
 * Split text into multiple lines based on available width.
 * Text is wrapped by word boundaries.
 */
function splitWrappedText(
  text: string,
  maxWidth: number,
  font: PDFFont,
  fontSize: number,
): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const lines: string[] = [];
  let line = tokens[0];

  for (let i = 1; i < tokens.length; i += 1) {
    const token = tokens[i];
    const nextLine = `${line} ${token}`;
    const nextWidth = font.widthOfTextAtSize(nextLine, fontSize);
    if (nextWidth > maxWidth) {
      lines.push(line);
      line = token;
    } else {
      line = nextLine;
    }
  }

  lines.push(line);
  return lines;
}

/**
 * Expand textData to handle wrapped text.
 * "center" and "long" kinds are split into multiple items when wrapping occurs.
 */
function expandWrappedTextData(
  textData: TextData[],
  maxWidth: number,
  style: StyleConfig,
): TextData[] {
  const expanded: TextData[] = [];

  for (const item of textData) {
    if (item.kind === "center" || item.kind === "long") {
      const lines = splitWrappedText(
        item.text,
        maxWidth,
        style[item.size].font,
        style[item.size].size,
      );

      for (const line of lines) {
        expanded.push({
          ...item,
          text: line,
        });
      }
    } else {
      expanded.push(item);
    }
  }

  return expanded;
}

class PdfDocError {
  static _tag = "PdfDocError";
  e: Error;
  constructor(error: unknown, msg: string) {
    this.e = error instanceof Error ? error : new Error(msg, { cause: error });
  }
  static fail(error: unknown, msg: string) {
    return Effect.fail(new PdfDocError(error, msg));
  }
}

function createPdfDoc() {
  return Effect.gen(function* () {
    const pdfDoc = yield* Effect.tryPromise({
      try: () => PDFDocument.create(),
      catch: (e) => new PdfDocError(e, "Failed to create pdf document"),
    });
    pdfDoc.registerFontkit(fontkit);
    const [regularFont, boldFont] = yield* Effect.all(
      [
        Effect.tryPromise({
          try: () => pdfDoc.embedFont(robotoRegularRaw),
          catch: (e) => new PdfDocError(e, "Failed to load roboto regular font"),
        }),
        Effect.tryPromise({
          try: () => pdfDoc.embedFont(robotoBoldRaw),
          catch: (e) => new PdfDocError(e, "Failed to load roboto bold font"),
        }),
      ],
      { concurrency: "unbounded" },
    );
    return {
      pdfDoc,
      font: {
        regular: regularFont,
        bold: boldFont,
      },
    };
  });
}

export function generatePdfBytes(data: ReceiptData, option: ReceiptOption) {
  return Effect.gen(function* () {
    const { pdfDoc, font } = yield* createPdfDoc();
    const style = {
      big: {
        lineHeight: font.bold.heightAtSize(option.size.big),
        size: option.size.big,
        font: font.bold,
      },
      normal: {
        lineHeight: font.regular.heightAtSize(option.size.normal),
        size: option.size.normal,
        font: font.regular,
      },
    } as const;

    const paperSize = {
      width: option.paperWidth * PT_IN_MM,
      height: option.padding * 6,
    };

    const textData = createReceiptData(data, paperSize.width);
    const maxWidth = paperSize.width - 2 * option.padding;

    // Expand text data: split wrapped text into multiple items
    const expandedTextData = expandWrappedTextData(textData, maxWidth, style);

    // Calculate paper height based on expanded text data
    for (const { size } of expandedTextData) {
      paperSize.height += style[size].lineHeight;
    }

    let cursorX = option.padding;
    let cursorY = paperSize.height - option.padding;

    const moveTo = (x: number, y: number) => {
      cursorX = x;
      cursorY = y;
    };

    const moveDown = (dy: number) => {
      cursorY -= dy;
    };

    const drawTextLine = (
      text: string,
      size: "normal" | "big",
      align: "left" | "center" = "left",
    ) => {
      const lineWidth = style[size].font.widthOfTextAtSize(text, style[size].size);
      const x =
        align === "center"
          ? option.padding + Math.max(0, (paperSize.width - 2 * option.padding - lineWidth) / 2)
          : cursorX;

      cursorX = x;

      moveDown(style[size].lineHeight);
      page.drawText(text, {
        x,
        y: cursorY,
        size: style[size].size,
        font: style[size].font,
        color: BLACK,
      });
    };

    const page = pdfDoc.addPage([paperSize.width, paperSize.height]);

    // Draw all expanded text data (no more wrapping logic needed here)
    for (const { size, ...data } of expandedTextData) {
      moveTo(option.padding, cursorY);
      switch (data.kind) {
        case "center": {
          drawTextLine(data.text, size, "center");
          break;
        }
        case "line": {
          const startX = data.x ?? option.padding;
          moveDown(style[size].lineHeight);
          page.drawLine({
            start: { x: startX, y: cursorY },
            end: { x: paperSize.width - option.padding, y: cursorY },
            thickness: 1,
            color: BLACK,
            dashArray: [4, 2],
          });
          break;
        }
        case "linebreak": {
          moveDown(style[size].lineHeight);
          break;
        }
        case "long": {
          drawTextLine(data.text, size, "left");
          break;
        }
        case "end": {
          const wordWidth = style[size].font.widthOfTextAtSize(data.text, style[size].size);
          const remainingSpace = paperSize.width - wordWidth - option.padding;
          moveDown(style[size].lineHeight);
          page.drawText(data.text, {
            x: remainingSpace,
            y: cursorY,
            font: style[size].font,
            size: style[size].size,
            color: BLACK,
          });
          break;
        }
        case "spacebetween": {
          const preferredX = data.x ?? 0;
          const firstWordWidth = style[size].font.widthOfTextAtSize(data.text[0], style[size].size);
          const secondWordWidth = style[size].font.widthOfTextAtSize(
            data.text[1],
            style[size].size,
          );
          const remainingSpace =
            paperSize.width - firstWordWidth - secondWordWidth - 2 * option.padding;
          const remainingSpacePreferred = remainingSpace - preferredX;
          let x = preferredX + option.padding;
          let spaceBetween = remainingSpacePreferred;
          if (remainingSpacePreferred < MINIMAL_GAP) {
            if (x + remainingSpace > MINIMAL_GAP) {
              x += remainingSpace;
              spaceBetween = MINIMAL_GAP;
            } else {
              x = 0;
            }
          }
          moveDown(style[size].lineHeight);
          page.drawText(data.text[0], {
            x,
            y: cursorY,
            size: style[size].size,
            font: style[size].font,
            color: BLACK,
          });
          page.drawText(data.text[1], {
            x: x + spaceBetween + firstWordWidth,
            y: cursorY,
            size: style[size].size,
            font: style[size].font,
            color: BLACK,
          });
          break;
        }
      }
    }
    const bytes = yield* Effect.tryPromise({
      try: () => pdfDoc.save(),
      catch: (e) => new PdfDocError(e, "Failed to save pdf"),
    });
    return new Uint8Array(bytes);
  });
}
