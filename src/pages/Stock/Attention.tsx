import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { useAttention } from "./use-attention";

export function Attention() {
  const [attention, setAttention] = useAttention();
  return (
    <Label className="flex items-center gap-1">
      Perhatian
      <Checkbox
        checked={attention}
        onCheckedChange={(e) => {
          if (e === true) {
            setAttention(true);
            return;
          }
          setAttention(false);
        }}
      />
    </Label>
  );
}
