import { tx } from "~/transaction";
import { basicStore, useFix } from "../use-transaction";
import { useTab } from "../use-tab";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { queue } from "../util-queue";

export function Precision() {
  const fix = useFix();
  const [tab] = useTab();
  return (
    <div>
      <label htmlFor="precision" className="flex pr-1 gap-2 items-center">
        Presisi
        <Select
          value={fix.toString()}
          onValueChange={(val) => {
            const num = Number(val);
            if (isNaN(num)) return;
            basicStore.set((prev) => ({ ...prev, fix: num }));
            queue.add(tx.transaction.update.fix(tab, num));
          }}
        >
          <SelectTrigger id="precision" className="h-8">
            <SelectValue>{fix}</SelectValue>
          </SelectTrigger>
          <SelectContent className="min-w-[50px]">
            <SelectGroup>
              {Array.from({ length: 6 }).map((_, i) => (
                <SelectItem showCheck key={i} value={i.toString()}>
                  {i}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        belakang koma
      </label>
    </div>
  );
}
