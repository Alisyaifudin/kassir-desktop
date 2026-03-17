// import { Effect } from 'effect';
// import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
// import { InvokeError } from './effect-error';

// export interface TextData {
//   size: "Normal" | "Big";
//   text: string;
// }

// export interface UserDefinedOption {
//   normal_line_height: number;
//   normal_font_size: number;
//   big_font_size: number;
//   big_line_height: number;
//   paper_height: number;
// }

// export function generateReceiptPdf(data: {
//   record: {

//   } 
// },) {
//   const widthMm = data.width || 80;
//   const widthPt = widthMm * 2.83465; // mm to points
//   const margin = 8;
//   const fontSize = 10;
//   const lineHeight = 14;

//   return Effect.gen(function* () {
//     const pdfDoc = yield* Effect.tryPromise({
//       try: () => PDFDocument.create(),
//       catch: (e) => new InvokeError(new Error('Failed to create PDF', { cause: e })),
//     });

//     const font = yield* Effect.tryPromise({
//       try: () => pdfDoc.embedFont(StandardFonts.Courier),
//       catch: (e) => new InvokeError(new Error('Failed to load font', { cause: e })),
//     });

//     const boldFont = yield* Effect.tryPromise({
//       try: () => pdfDoc.embedFont(StandardFonts.CourierBold),
//       catch: (e) => new InvokeError(new Error('Failed to load bold font', { cause: e })),
//     });

//     // Calculate height
//     const headerLines = 3;
//     const itemLines = data.items.length;
//     const footerLines = 4;
//     const heightPt = (headerLines + itemLines + footerLines) * lineHeight + margin * 3;

//     const page = pdfDoc.addPage([widthPt, heightPt]);
//     let y = heightPt - margin;

//     // Header
//     const titleWidth = boldFont.widthOfTextAtSize(data.storeName, 16);
//     boldFont.heightAtSize
//     page.drawText(data.storeName, {
//       x: (widthPt - titleWidth) / 2,
//       y: y - 16,
//       size: 16,
//       font: boldFont,
//       color: rgb(0, 0, 0),
//     });
//     y -= 35;

//     // Date
//     page.drawText(data.date || new Date().toLocaleString(), {
//       x: margin,
//       y,
//       size: 9,
//       font,
//       color: rgb(0, 0, 0),
//     });
//     y -= 20;

//     // Line
//     page.drawLine({
//       start: { x: margin, y },
//       end: { x: widthPt - margin, y },
//       thickness: 1,
//       color: rgb(0, 0, 0),
//     });
//     y -= 15;

//     // Items
//     let subtotal = 0;
//     for (const item of data.items) {
//       const total = item.qty * item.price;
//       subtotal += total;

//       const name = item.name.length > 18 ? item.name.slice(0, 15) + '...' : item.name;
      
//       page.drawText(`${name} x${item.qty}`, {
//         x: margin,
//         y,
//         size: fontSize,
//         font,
//         color: rgb(0, 0, 0),
//       });

//       const priceText = `$${total.toFixed(2)}`;
//       const priceWidth = font.widthOfTextAtSize(priceText, fontSize);
//       page.drawText(priceText, {
//         x: widthPt - margin - priceWidth,
//         y,
//         size: fontSize,
//         font,
//         color: rgb(0, 0, 0),
//       });
      
//       y -= lineHeight;
//     }

//     // Footer line
//     y -= 5;
//     page.drawLine({
//       start: { x: margin, y },
//       end: { x: widthPt - margin, y },
//       thickness: 1,
//       color: rgb(0, 0, 0),
//     });
//     y -= 20;

//     // Totals
//     const drawTotalLine = (label: string, amount: number, isBold = false) => {
//       const f = isBold ? boldFont : font;
//       const s = isBold ? 12 : fontSize;
      
//       page.drawText(label, {
//         x: margin,
//         y,
//         size: s,
//         font: f,
//         color: rgb(0, 0, 0),
//       });

//       const text = `$${amount.toFixed(2)}`;
//       const w = f.widthOfTextAtSize(text, s);
//       page.drawText(text, {
//         x: widthPt - margin - w,
//         y,
//         size: s,
//         font: f,
//         color: rgb(0, 0, 0),
//       });
//       y -= isBold ? 18 : lineHeight;
//     };

//     drawTotalLine('Subtotal:', subtotal);
//     const tax = subtotal * 0.08;
//     drawTotalLine('Tax (8%):', tax);
//     drawTotalLine('TOTAL:', subtotal + tax, true);

//     const bytes = yield* Effect.tryPromise({
//       try: () => pdfDoc.save(),
//       catch: (e) => new InvokeError(new Error('Failed to save PDF', { cause: e })),
//     });

//     return new Uint8Array(bytes);
//   });
// }

// // Usage