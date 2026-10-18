import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { STAGES, type Stage } from "./Draft";
import { Total } from "./Draft/z-Total";

/**
 * The bottom panel: what the purchase costs, and the two moves that walk the
 * main panel through its stages. The step counter sits under the total so the
 * operator can see how far along the purchase is.
 *
 * The move that the current stage cannot make is hidden rather than disabled,
 * but keeps its space so the grand total stays put on every stage.
 */
export function Bottom({ stage, onChange }: { stage: Stage; onChange: (stage: Stage) => void }) {
  const index = STAGES.indexOf(stage);
  const prev = index > 0 ? STAGES[index - 1] : null;
  const next = index < STAGES.length - 1 ? STAGES[index + 1] : null;
  return (
    <section className="flex flex-none items-center gap-3 border-t px-2 py-1">
      <Button
        variant="outline"
        className={cn(prev === null && "invisible")}
        onClick={() => prev && onChange(prev)}
      >
        <ChevronLeft className="icon" />
        Sebelumnya
      </Button>
      <div className="flex min-w-0 flex-1 flex-col items-center">
        <Total />
      </div>
      <Button
        className={cn(next === null && "invisible")}
        onClick={() => next && onChange(next)}
      >
        Berikutnya
        <ChevronRight className="icon" />
      </Button>
    </section>
  );
}
