import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { service } from "~/services";
import type { Draft } from "~/services/transaction";
import { run } from "../run";

/**
 * How many decimal places money is shown with. Presentation only — the stored
 * numbers keep their full value; this is the `fix` the record is rendered with.
 */
export function Precision({ draft }: { draft: Draft }) {
  return (
    <label htmlFor="precision" className="flex items-center gap-2 pb-1 select-none">
      <span className="text-small text-muted-foreground">Presisi</span>
      <Select
        value={draft.fix.toString()}
        onValueChange={(value) => run(service.transaction.set.fix(draft.id, Number(value)))}
      >
        <SelectTrigger id="precision" className="h-8 small:w-[64px] w-[80px]">
          <SelectValue>{draft.fix}</SelectValue>
        </SelectTrigger>
        <SelectContent className="min-w-[50px]">
          <SelectGroup>
            {Array.from({ length: 6 }).map((_, i) => (
              <SelectItem key={i} value={i.toString()}>
                {i}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      belakang koma
    </label>
  );
}
