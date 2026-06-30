import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { TextError } from "~/components/TextError";
import { Effect } from "effect";
import { PrinterService } from "~/services/print";
import { useCallback } from "react";
import { FieldHeader } from "./z-FieldHeader";

export const selectPrinter = Effect.gen(function* () {
  const printerService = yield* PrinterService;
  const usePrinters = printerService.usePrinters;
  const printer = printerService.printer;
  return function SelectPrinter() {
    const printers = usePrinters();
    const state = printer.useData();
    const current = state.data;
    const selected =
      printers.length === 0
        ? undefined
        : current !== null
          ? printers.find((printer) => printer.id === current.id)
          : printers[0];
    const handleChange = useCallback(
      (id: string) => {
        const selected = printers.find((p) => p.id === id);
        if (selected === undefined) return;
        printer.setData(selected);
      },
      [printers],
    );
    return (
      <div className="flex flex-col gap-1">
        <FieldHeader
          id="default-printer"
          label="Printer Terpilih"
          loading={state.state === "loading"}
          description="Pilih printer yang akan digunakan untuk mencetak struk"
        />

        <Select value={selected?.id} onValueChange={handleChange}>
          <SelectTrigger id="default-printer" className="bg-background border-border mt-1">
            <SelectValue placeholder={selected?.name ?? "Tidak ada printer"} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {printers.map(({ id, name }) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <TextError>{state?.error}</TextError>
      </div>
    );
  };
});
