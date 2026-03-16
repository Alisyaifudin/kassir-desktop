import { Effect } from "effect";
import { useState } from "react";
import { log } from "~/lib/log";
import { store } from "~/store";
import { printReceipt } from "~/lib/printer";
import { createReceipt, FONT_SIZE_SCALE, option, ReceiptData } from "~/lib/receipt";

export function useTestPrint() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);

  async function handleClick() {
    setLoading(true);
    const errMsg = await Effect.runPromise(program);
    setLoading(false);
    setError(errMsg);
  }

  return {
    loading,
    error,
    handleClick,
  };
}
// 1.867 -> 70 = 80 mm
// x -> 80

// 3 * 52.5 = 80 x
const mockData: Omit<ReceiptData, "info"> = {
  record: {
    cashier: "Raisya",
    change: 90,
    fix: 0,
    grandTotal: 12010,
    method: {
      id: 1000,
      kind: "cash",
    },
    paidAt: Date.now(),
    pay: 1300,
    rounding: 10,
    subTotal: 10000,
    timestamp: Date.now(),
    total: 12_000_000,
  },
  extras: [
    {
      name: "Extra 1",
      value: -1000,
      kind: "number",
      eff: -1000,
    },
    {
      name: "Extra 1",
      value: 10,
      kind: "percent",
      eff: 1000,
    },
  ],
  products: [
    {
      name: "Product 1",
      price: 1000,
      qty: 3,
      total: 3000,
      discounts: [
        {
          kind: "percent",
          value: 10,
          eff: 1000,
        },
        {
          kind: "number",
          value: 1234,
          eff: 1234,
        },
        {
          kind: "pcs",
          value: 1,
          eff: 1000,
        },
      ],
    },
    {
      name: "Product 2",
      price: 2000,
      qty: 2,
      total: 4000,
      discounts: [],
    },
    {
      name: "Pilih printer yang akan digunakan untuk mencetak struk",
      price: 2000,
      qty: 2,
      total: 4000,
      discounts: [],
    },
    {
      name: "Product 4",
      price: 2000,
      qty: 2,
      total: 4000,
      discounts: [],
    },
  ],
  socials: [
    {
      name: "Facebook",
      value: "@raisya",
    },
    {
      name: "Instagram",
      value: "@raisya",
    },
  ],
};

const program = Effect.gen(function* () {
  const printer = yield* store.printer.get();
  const info = yield* store.info.get();
  const { textData, paperHeight } = createReceipt(
    {
      ...mockData,
      info,
    },
    {
      ...option,
      paper_width: printer.width,
    },
  );
  yield* printReceipt(printer, textData, {
    ...option,
    big_font_size: option.big_font_size * FONT_SIZE_SCALE,
    big_line_height: option.big_line_height * FONT_SIZE_SCALE,
    normal_line_height: option.normal_line_height * FONT_SIZE_SCALE,
    normal_font_size: option.normal_font_size * FONT_SIZE_SCALE,
    paper_height: paperHeight,
  });
  return null;
}).pipe(
  Effect.catchAll(({ e }) => {
    log.error(e);
    return Effect.succeed(e.message);
  }),
);
