import { useCallback, useState } from "react";
import { TextError } from "~/components/TextError";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { FieldHeader } from "./z-FieldHeader";
import type { Printer } from "~/services/print/type";

type Props = {
  printers: Printer[];
  printer: Printer | null;
  onSetPrinter: (printer: Printer) => Promise<string | null>;
};

export function SelectPrinter({ printers, printer, onSetPrinter }: Props) {
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
      const err = await onSetPrinter(selected);
      setLoading(false);
      setError(err);
    },
    [printers, loading, onSetPrinter],
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
}
