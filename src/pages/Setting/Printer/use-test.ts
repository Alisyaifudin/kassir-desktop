import { Effect } from "effect";
import { useState } from "react";
import { log } from "~/lib/log";
import { store } from "~/store";
import { printReceipt } from "~/lib/printer";
import { createReceipt, FONT_SIZE_SCALE, option, ReceiptData } from "~/lib/receipt";
import { mockData } from "./mock-data";

export function useTestPrint() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);

  async function handleClick() {
    setLoading(true);
    const errMsg = await Effect.runPromise(programPrint(mockData));
    setLoading(false);
    setError(errMsg);
  }

  return {
    loading,
    error,
    handleClick,
  };
}
export const programPrint = (data: Omit<ReceiptData, "info">) =>
  Effect.gen(function* () {
    const printer = yield* store.printer.get();
    const info = yield* store.info.get();
    const { textData, paperHeight } = createReceipt(
      {
        ...data,
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
