import { DateRangePicker } from "~/components/CalendarPicker/DateRangePicker";
import { Temporal } from "temporal-polyfill";
import { Button } from "~/components/ui/button";
import { ModeSelect } from "./z-ModeSelect";
import { epochToPlainDate, type Preset } from "./use-range";

type Props = {
  size: "big" | "small";
  preset: Preset;
  start: number;
  end: number;
  tz: string;
  onPresetChange: (p: Preset) => void;
  onCustomRangeChange: (r: [Temporal.PlainDate, Temporal.PlainDate], tz: string) => void;
};

const presets: { key: Preset; label: string }[] = [
  { key: "30d", label: "30 Hari" },
  { key: "thisYear", label: "Tahun Ini" },
  { key: "1y", label: "1 Tahun" },
  { key: "all", label: "Sepanjang Masa" },
  { key: "custom", label: "Kustom" },
];

const panelStyle: Record<"big" | "small", { height: string }> = {
  big: { height: "52px" },
  small: { height: "44px" },
};

export function Panel({ size, preset, start, end, tz, onPresetChange, onCustomRangeChange }: Props) {
  return (
    <div style={panelStyle[size]} className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {presets.map((p) => (
          <Button
            key={p.key}
            variant={preset === p.key ? "default" : "ghost"}
            size="sm"
            onClick={() => onPresetChange(p.key)}
          >
            {p.label}
          </Button>
        ))}
        {preset === "custom" && (
          <DateRangePicker
            range={[epochToPlainDate(start, tz), epochToPlainDate(end, tz)]}
            setRange={(r) => onCustomRangeChange(r, tz)}
          />
        )}
      </div>
      <ModeSelect />
    </div>
  );
}
