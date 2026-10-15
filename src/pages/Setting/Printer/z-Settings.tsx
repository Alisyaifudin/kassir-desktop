import { LoaderMany } from "~/components/Loader";
import { useData } from "./use-data";
import { Loading } from "./z-Loading";
import { PrinterErrorBoundary, PrinterErrorFallback } from "./z-Error";
import { PrinterWidth } from "./z-PrinterWidth";
import { SelectPrinter } from "./z-SelectPrinter";

export function Settings() {
  const data = useData();
  return (
    <PrinterErrorBoundary fallback={PrinterErrorFallback}>
      <LoaderMany res={data} fallback={<Loading />}>
        {({ printer, printers }) => (
          <>
            <SelectPrinter printer={printer} printers={printers} />
            <PrinterWidth printer={printer} />
          </>
        )}
      </LoaderMany>
    </PrinterErrorBoundary>
  );
}
