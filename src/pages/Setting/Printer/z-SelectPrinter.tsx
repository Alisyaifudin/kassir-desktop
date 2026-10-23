import { Label } from "~/components/ui/label";
import { useChangePrinterName } from "./use-change-name";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import type { Printer } from "~/services/printer";

export function SelectPrinter({ printer, printers }: { printer: Printer; printers: string[] }) {
  // The stored printer can be gone (unplugged, renamed): show the first one the
  // system offers instead, without claiming it has been written yet.
  const fallback = printers.includes(printer.name)
    ? printer.name
    : (printers.at(0) ?? printer.name);
  const { error, handleChange, loading, name } = useChangePrinterName(printer, fallback);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <Label htmlFor="default-printer" className="text-normal  font-semibold">
          Printer Terpilih
        </Label>
        <Spinner when={loading} />
      </div>
      <p className="text-normal text-muted-foreground">
        Pilih printer yang akan digunakan untuk mencetak struk
      </p>
      <Select value={name} onValueChange={handleChange}>
        <SelectTrigger id="default-printer" className="bg-background border-border mt-1">
          <SelectValue placeholder={printer.name} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {printers.map((it) => (
              <SelectItem key={it} value={it}>
                {it}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <TextError>{error}</TextError>
    </div>
  );
}
