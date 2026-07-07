import { z } from "zod";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { useDeltaFilter } from "./use-mode";

export function ModeSelect() {
  const [delta, setDelta] = useDeltaFilter();

  return (
    <div className="flex items-center gap-7">
      <RadioGroup
        value={delta}
        className="flex items-center gap-5"
        onValueChange={(v) => {
          const parsed = z.enum(["positive", "negative"]).safeParse(v);
          if (parsed.success) setDelta(parsed.data);
        }}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="positive" id="positive" />
          <Label htmlFor="positive">Penambahan</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="negative" id="negative" />
          <Label htmlFor="negative">Pengurangan</Label>
        </div>
      </RadioGroup>
    </div>
  );
}
