import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type Decimal from "decimal.js";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { STAGES, type Stage } from "./Draft";
import { Total } from "~/components/cart/z-Total";

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
  disabled,
  focusPay,
  onFocusRounding,
  onExitUp,
  onSubmit,
}: {
  stage: Stage;
  onChange: (stage: Stage) => void;
  grand: Decimal;
  fix: number;
  change: Decimal;
  /** A hard line problem or a zero total keeps the purchase from settling. */
  disabled: boolean;
  focusPay: number;
  /** Bayar pressed Left: go back to the payment grid's rounding cell. */
  onFocusRounding: () => void;
  /** Bayar pressed Up: leave the payment grid for the goods. */
  onExitUp: () => void;
  /** Starts the commit; false while the purchase cannot be paid. */
  onSubmit: () => boolean;
}) {
  const payRef = useRef<HTMLButtonElement>(null);
  const seenFocusPay = useRef(focusPay);
  const [payFocused, setPayFocused] = useState(false);
  useEffect(() => {
    if (focusPay === seenFocusPay.current) return;
    seenFocusPay.current = focusPay;
    payRef.current?.focus();
  }, [focusPay]);
  useEffect(() => {
    if (stage !== "payment") setPayFocused(false);
  }, [stage]);
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
      </div>
      {stage === "payment" ? (
        <Button
          ref={payRef}
          disabled={disabled || change.isNegative()}
          className={cn(
            "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            payFocused && "ring-2 ring-primary ring-offset-2 ring-offset-background",
          )}
          onFocus={() => setPayFocused(true)}
          onBlur={() => setPayFocused(false)}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              onFocusRounding();
              return;
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              onExitUp();
            }
          }}
          onClick={() => onSubmit()}
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
