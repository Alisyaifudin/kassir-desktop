import { useCallback } from "react";
import type { Theme } from "~/services/config";
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

type Props = {
  useTheme: () => Theme;
  onSetTheme: (theme: Theme) => void;
};

export function SelectTheme({ useTheme, onSetTheme }: Props) {
  const theme = useTheme();
  const handleChange = useCallback(
    (newTheme: string) => {
      if (newTheme !== "system" && newTheme !== "light" && newTheme !== "dark") return;
      onSetTheme(newTheme);
    },
    [onSetTheme],
  );
  return (
    <div className="flex items-center gap-4">
      <label className="font-semibold text-normal w-24 shrink-0">Tema</label>
      <Select value={theme} onValueChange={handleChange}>
        <SelectTrigger className="w-40" aria-label="Tema">
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
