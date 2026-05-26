import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { useInterval } from "./use-interval";
import { z } from "zod";
import { Label } from "~/components/ui/label";

export function IntervalPicker() {
  const [interval, setInterval] = useInterval();
  const handleClickInterval = (v: string) => {
    const interval = z.enum(["year", "all", "month"]).catch("month").parse(v);
    setInterval(interval);
  };
  return (
    <RadioGroup
      value={interval}
      className="flex items-center gap-5"
      onValueChange={handleClickInterval}
    >
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="month" id="month" />
        <Label htmlFor="month">Bulan</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="year" id="year" />
        <Label htmlFor="year">Tahun</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="all" id="all-time" />
        <Label htmlFor="all-time">Sepanjang Masa</Label>
      </div>
    </RadioGroup>
  );
}
