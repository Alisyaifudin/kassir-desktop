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
  { value: "light", label: "Terang" },
  { value: "dark", label: "Gelap" },
  { value: "system", label: "Sistem" },
] as const;

export const selectTheme = Effect.gen(function* () {
  const config = yield* ConfigService;
  const useTheme = config.theme.useTheme;
  return function SelectTheme() {
    const theme = useTheme();
    const handleChange = useCallback((newTheme: string) => {
      if (newTheme !== "system" && newTheme !== "light" && newTheme !== "dark") return;
      config.theme.set(newTheme);
    }, []);
    return (
      <div className="flex items-center gap-4">
        <label className="font-semibold text-normal w-24 shrink-0">Tema</label>
        <Select value={theme} onValueChange={handleChange}>
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
