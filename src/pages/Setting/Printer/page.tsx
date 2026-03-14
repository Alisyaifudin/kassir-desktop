import { useData } from "./use-data";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";
import { SelectPrinter } from "./z-SelectPrinter";
import { PrinterWidth } from "./z-PrinterWidth";
import { TestBtn } from "./z-TestBtn";

export default function Page() {
  return (
    <div className="flex flex-col gap-6 p-6 flex-1">
      <div className="flex flex-col gap-1">
        <h1 className="text-big font-bold text-foreground">Pengaturan Printer</h1>
        <p className="text-muted-foreground text-normal">Konfigurasi printer untuk cetak struk</p>
      </div>
      <Loader />
      <TestBtn />
    </div>
  );
}

function Loader() {
  const res = useData();
  return Result.match(res, {
    onLoading() {
      return <div>Loading...</div>;
    },
    onError({ e }) {
      log.error(e);
      return <p>{e.message}</p>;
    },
    onSuccess([printer, printers]) {
      return <Wrapper printer={printer} printers={printers} />;
    },
  });
}

function Wrapper({
  printer,
  printers,
}: {
  printer: { name: string; width: number };
  printers: string[];
}) {
  return (
    <>
      <SelectPrinter name={printer.name} printers={printers} />
      <PrinterWidth width={printer.width} />
    </>
  );
}
