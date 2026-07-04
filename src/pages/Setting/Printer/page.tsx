import { TestBtn } from "./z-TestBtn";
import { Loading } from "./z-Loading";
import { Effect } from "effect";
import { PrinterService } from "~/services/print";
import { StateWrap } from "~/components/StateWrap";
import { TextError } from "~/components/TextError";
import { SelectPrinter } from "./z-SelectPrinter";
import { PrinterWidth } from "./z-PrinterWidth";
import { promisify } from "~/lib/promisify";
import type { Printer } from "~/services/print/type";

const page = Effect.gen(function* () {
  const printerService = yield* PrinterService;

  const onTestPrint = () =>
    promisify(
      () => printerService.testPrint(),
      (e) => e.e.message,
    );
  const onSetSize = (size: number) =>
    promisify(
      () => printerService.size.set(size),
      (e) => e.e.message,
    );
  const onSetPrinter = (printer: Printer) =>
    promisify(
      () => printerService.printer.set(printer),
      (e) => e.e.message,
    );

  return function Page() {
    return (
      <div className="flex flex-col gap-6 p-6 flex-1">
        <div className="flex flex-col gap-1">
          <h1 className="text-big font-bold text-foreground">Pengaturan Printer</h1>
          <p className="text-muted-foreground text-normal">Konfigurasi printer untuk cetak struk</p>
        </div>
        <StateWrap
          loader={printerService.loader}
          loading={<Loading />}
          error={({ e }) => <TextError>{e.message}</TextError>}
        >
          <SelectPrinter
            printers={printerService.printer.usePrinters()}
            printer={printerService.printer.usePrinter()}
            onSetPrinter={onSetPrinter}
          />
          <PrinterWidth
            size={printerService.size.useSize()}
            onSetSize={onSetSize}
          />
          <TestBtn print={onTestPrint} />
        </StateWrap>
      </div>
    );
  };
});

export default page;
