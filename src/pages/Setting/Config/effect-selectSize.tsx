import { Effect } from "effect";
import { useCallback } from "react";
import { ConfigService } from "~/services/config";
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

export const selectSize = Effect.gen(function* () {
  const config = yield* ConfigService;
  const useSize = () => config.size.useSize();
  return function SelectSize() {
    const size = useSize();
    const handleChange = useCallback((newSize: string) => {
      if (newSize !== "big" && newSize !== "small") return;
      config.size.set(newSize);
    }, []);
    return (
      <div className="flex items-center gap-4">
        <label className="font-semibold text-normal w-24 shrink-0">Ukuran</label>
        <Select value={size} onValueChange={handleChange}>
          <SelectTrigger className="w-40">
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
  };
});
