import { Effect } from "effect";
import { useState } from "react";
import { log } from "~/lib/log";
import { store } from "~/store";
import { printReceipt, TextData, UserDefinedOption } from "~/lib/printer";

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

const FONT_SCALE = 1.633625;

const option: UserDefinedOption = {
  normal_line_height: 1.7, // mm
  normal_font_size: 1.5, // mm
  big_font_size: 2.0, // mm
  big_line_height: 2.2, // mm
  paper_height: 80.0, // mm
};
// Mock test data for print testing
const companyName = "Maskeransay";
const companyDescription = "Toko Kosmetik & Skincares";
const storeAddress = "Jl. A.W. Syahranie No. 26, Seberang Kantor BPJS";
const cashier = "Kasir: Raisya";
const orderNumber = "No: 1766128208957";
const date = "2023/12/12, 10:00";
const paperWidth = 80.0; // mm
const padding = 2.0; // mm

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
const capacityNormalHorizontal = getHorizontalCapacity({
  padding: padding,
  paperWidth,
  fontSize: option.normal_font_size,
});
const capacityBigHorizontal = getHorizontalCapacity({
  padding: padding,
  paperWidth,
  fontSize: option.big_font_size,
});

const companySpace = " ".repeat(
  Math.max(0, capacityBigHorizontal - companyName.length - padding) / 2,
);
const descriptionSpace = " ".repeat(
  Math.max(0, capacityNormalHorizontal - companyDescription.length - padding) / 2,
);

const mockTestData: TextData[] = [
  // {
  //   size: "Big",
  //   text: Array.from({ length: 10 })
  //     .map((_, i) => `${i + 1}`.padEnd(10, "-"))
  //     .join(""),
  //   position: {
  //     x: 0,
  //     y: 0,
  //   },
  // },
  // {
  //   size: "Normal",
  //   text: Array.from({ length: 10 })
  //     .map((_, i) => `${i + 1}`.padEnd(10, "-"))
  //     .join(""),
  //   position: {
  //     x: 0,
  //     y: option.big_line_height,
  //   },
  // },
  {
    size: "Big",
    text: companySpace + companyName + companySpace,
    position: {
      // x: (paperWidth - companyName.length * option.big_font_size) / 2,
      // y: option.paper_height - padding - option.big_line_height,
      x: padding,
      y: option.paper_height - padding - option.big_line_height,
    },
  },
  {
    size: "Normal",
    text: descriptionSpace + companyDescription + descriptionSpace,
  },
  {
    size: "Normal",
    text: storeAddress,
  },
  {
    size: "Normal",
    text: cashier,
  },
  {
    size: "Normal",
    text:
      orderNumber +
      " ".repeat(Math.max(0, capacityNormalHorizontal - orderNumber.length - date.length)) +
      date,
  },
  {
    size: "Normal",
    text: Array.from({
      length: capacityNormalHorizontal,
    })
      .map(() => "-")
      .join(""),
  },
];

const program = Effect.gen(function* () {
  const printer = yield* store.printer.get();
  console.log(printer);
  yield* printReceipt(printer, mockTestData, {
    ...option,
    big_font_size: option.big_font_size * FONT_SCALE,
    big_line_height: option.big_line_height * FONT_SCALE,
    normal_line_height: option.normal_line_height * FONT_SCALE,
    normal_font_size: option.normal_font_size * FONT_SCALE,
  });
  return null;
}).pipe(
  Effect.catchAll(({ e }) => {
    log.error(e);
    return Effect.succeed(e.message);
  }),
);
