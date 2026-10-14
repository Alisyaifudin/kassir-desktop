import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import type { RecordMode } from "~/services/record";
import { useMode } from "../use-mode";

/** `incoming` is a sale (money in); `outcoming` is a purchase (money out). */
const MODES: { value: RecordMode; label: string }[] = [
  { value: "incoming", label: "Masuk" },
  { value: "outcoming", label: "Keluar" },
];

export function ModeSelect() {
  const [mode, setMode] = useMode();
  return (
    <div className="flex items-center gap-7">
      <RadioGroup
        value={mode}
        className="flex items-center gap-5"
        onValueChange={(value) => {
          const match = MODES.find((item) => item.value === value);
          if (match !== undefined) setMode(match.value);
        }}
      >
        {MODES.map((item) => (
          <div key={item.value} className="flex items-center space-x-2">
            <RadioGroupItem value={item.value} id={`search-mode-${item.value}`} />
            <Label htmlFor={`search-mode-${item.value}`}>{item.label}</Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
