import { memo } from "react";
import { z } from "zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

const pocketType = z.enum(["absolute", "change"]);

export const SelectType = memo(function SelectType({
  type,
  onChange,
}: {
  type: "absolute" | "change";
  onChange: (type: "absolute" | "change") => void;
}) {
  return (
    <Select
      value={type}
      onValueChange={(value) => onChange(pocketType.catch("absolute").parse(value))}
    >
      {/* Same box as the `NumberField` beside it: `text-base` with the input's
          `py-1`, so the pair reads as one row instead of two heights. */}
      <SelectTrigger aria-label="Jenis catatan" className="w-fit shrink-0 py-1 text-base">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="change">Perubahan</SelectItem>
        <SelectItem value="absolute">Mutlak</SelectItem>
      </SelectContent>
    </Select>
  );
});
