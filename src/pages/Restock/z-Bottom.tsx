import { ChevronLeft, ChevronRight } from "lucide-react";
import type Decimal from "decimal.js";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { STAGES, type Stage } from "./Draft";
import { Total } from "./Draft/z-Total";

/**
 * The bottom panel: what the purchase costs and the moves that walk the main
 * panel through its stages. On the payment stage `Berikutnya` becomes `Bayar`,
 * so settling the purchase never sits next to the move that leaves it.
 */
export function Bottom({
  stage,
  onChange,
  grand,
  fix,
  change,
}: {
  stage: Stage;
  onChange: (stage: Stage) => void;
  grand: Decimal;
  fix: number;
  change: Decimal;
}) {
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
        <Total grand={grand} fix={fix} />
        <span className="text-small text-muted-foreground tabular-nums select-none">
          {index + 1} / {STAGES.length}
        </span>
      </div>
      {stage === "payment" ? (
        <Button
          disabled={change.isNegative()}
          onClick={() => {
            // TODO(submit): write the draft into `records` (stock, payments,
            // rounding), then delete its `tx_records` row.
          }}
        >
          Bayar
        </Button>
      ) : (
        <Button
          className={cn(next === null && "invisible")}
          onClick={() => next && onChange(next)}
        >
          Berikutnya
          <ChevronRight className="icon" />
        </Button>
      )}
    </section>
  );
}
