import { useCallback } from "react";
import type { Size } from "~/services/config";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

const options = [
  { value: "small", label: "Kecil" },
  { value: "big", label: "Besar" },
] as const;

type Props = {
  useSize: () => Size;
  onSetSize: (size: Size) => void;
};

export function SelectSize({ useSize, onSetSize }: Props) {
  const size = useSize();
  const handleChange = useCallback(
    (newSize: string) => {
      if (newSize !== "big" && newSize !== "small") return;
      onSetSize(newSize);
    },
    [onSetSize],
  );
  return (
    <div className="flex items-center gap-4">
      <label className="font-semibold text-normal w-24 shrink-0">Ukuran</label>
      <Select value={size} onValueChange={handleChange}>
        <SelectTrigger className="w-40" aria-label="Ukuran">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
