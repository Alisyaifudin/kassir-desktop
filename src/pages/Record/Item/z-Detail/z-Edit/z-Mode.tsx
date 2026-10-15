import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { RecordMode } from "~/services/record";

export function ModeSelect({
  mode,
  setMode,
  disabled,
}: {
  mode: RecordMode;
  setMode: (mode: RecordMode) => void;
  disabled: boolean;
}) {
  return (
    <label className="grid grid-cols-[120px_1fr] items-center gap-2">
      <span>Mode</span>
      <div className="flex items-center gap-2">
        <span>:</span>
        <Select
          value={mode}
          onValueChange={(value) => {
            if (value === "incoming" || value === "outcoming") setMode(value);
          }}
          disabled={disabled}
        >
          <SelectTrigger className="w-fit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="incoming" showCheck>Jual</SelectItem>
              <SelectItem value="outcoming" showCheck>Beli</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </label>
  );
}
