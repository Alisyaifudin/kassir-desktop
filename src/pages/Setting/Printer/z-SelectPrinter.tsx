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

export function SelectPrinter({ name: init, printers }: { name: string; printers: string[] }) {
  const selectedPrinter = printers.includes(init) ? init : printers.length > 0 ? printers[0] : "";
  const { error, handleChange, loading, name } = useChangePrinterName(selectedPrinter);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <Label htmlFor="default-printer" className="text-normal  font-semibold">
          Printer Terpilih
        </Label>
        <Spinner when={loading} />
      </div>
      <p className="text-muted-foreground text-small">
        Pilih printer yang akan digunakan untuk mencetak struk
      </p>
      <Select value={name} onValueChange={handleChange}>
        <SelectTrigger id="default-printer" className="bg-background border-border mt-1">
          <SelectValue placeholder={init} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {printers.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <TextError>{error}</TextError>
    </div>
  );
}
