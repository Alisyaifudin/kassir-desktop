import { TextError } from "~/components/TextError";
import { memo } from "react";
import { useMode } from "./use-mode";
import { Spinner } from "~/components/Spinner";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export const SelectMode = memo(function SelectMode({
  close,
  mode,
  recordId,
}: {
  mode: DB.Mode;
  close: () => void;
  recordId: string;
}) {
  const { error, handleChange, loading, selected } = useMode(recordId, mode, close);
  return (
    <label className="grid grid-cols-[120px_1fr] items-center gap-2">
      <span>Mode</span>
      <div className="flex gap-2">
        <span>:</span>
        <Select value={selected} onValueChange={handleChange}>
          <SelectTrigger className="w-fit">
            <SelectValue placeholder="Metode" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="sell" showCheck>
                Jual
              </SelectItem>
              <SelectItem value="buy" showCheck>
                Beli
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Spinner when={loading} />
      </div>
      <TextError className="col-span-2">{error}</TextError>
    </label>
  );
});
