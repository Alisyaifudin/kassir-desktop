import { TestBtn } from "./z-TestBtn";
import { Loading } from "./z-Loading";
import { Effect } from "effect";
import { PrinterService } from "~/services/print";
import { StateWrap } from "~/components/StateWrap";
import { TextError } from "~/components/TextError";
import { selectPrinter } from "./effect-selectPrinter";
import { printerWidth } from "./effect-printerWidth";

const page = Effect.gen(function* () {
  const printerService = yield* PrinterService;
  const useLoad = printerService.useLoad;
  const SelectPrinter = yield* selectPrinter;
  const PrinterWidth = yield* printerWidth;
  return function Page() {
    const status = useLoad();
    return (
      <div className="flex flex-col gap-6 p-6 flex-1">
        <div className="flex flex-col gap-1">
          <h1 className="text-big font-bold text-foreground">Pengaturan Printer</h1>
          <p className="text-muted-foreground text-normal">Konfigurasi printer untuk cetak struk</p>
        </div>
        <StateWrap
          status={status}
          loading={<Loading />}
          error={({ e }) => <TextError>{e.message}</TextError>}
        >
          <SelectPrinter />
          <PrinterWidth />
          <TestBtn print={printerService.testPrint} />
        </StateWrap>
      </div>
    );
  };
});

export default page;
