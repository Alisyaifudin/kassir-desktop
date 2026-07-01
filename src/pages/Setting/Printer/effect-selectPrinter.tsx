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
import { useCallback, useState } from "react";
import { FieldHeader } from "./z-FieldHeader";

export const selectPrinter = Effect.gen(function* () {
  const printerService = yield* PrinterService;
  const usePrinters = printerService.printer.usePrinters;
  const usePrinter = printerService.printer.usePrinter;
  return function SelectPrinter() {
    const printers = usePrinters();
    const printer = usePrinter();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const selected =
      printers.length === 0
        ? undefined
        : printer !== null
          ? printers.find((p) => p.id === printer.id)
          : printers[0];
    const handleChange = useCallback(
      async (id: string) => {
        if (loading) return;
        const selected = printers.find((p) => p.id === id);
        if (selected === undefined) return;
        setLoading(true);
        const error = await printerService.printer.set(selected);
        setLoading(false);
        setError(error);
      },
      [printers, loading],
    );
    return (
      <div className="flex flex-col gap-1">
        <FieldHeader
          id="default-printer"
          label="Printer Terpilih"
          loading={loading}
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
        <TextError>{error}</TextError>
      </div>
    );
  };
});
