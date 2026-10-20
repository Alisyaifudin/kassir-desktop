import { useRef, useState } from "react";
import Decimal from "decimal.js";
import { useStream } from "~/components/Loader";
import { Loading } from "~/components/Loading";
import { cn } from "~/lib/utils";
import { service } from "~/services";
import type { MethodCatalog } from "~/services/method";
import type { Draft } from "~/services/transaction";
import { rupiah } from "./util-rupiah";
import { Methods } from "./Draft/z-Methods";
import { Options } from "./Draft/z-Options";
import { Total } from "./Draft/z-Total";
import { CashierName } from "./z-CashierName";
import { Button } from "~/components/ui/button";

/**
 * The bottom panel of the Pos screen: the settle strip. There is no payment
 * stage — the payment rows and the change readout sit at the left, while the
 * grand total, the cashier and the sale's options sit on the right. Stage moves
 * live in the top panel.
 */
export function Bottom({
  draft,
  grand,
  change,
  focusPayment,
  focusTop,
  onExitUp,
  focused,
  onActivate,
}: {
  draft: Draft;
  grand: Decimal;
  change: Decimal;
  focusPayment: number;
  focusTop: number;
  onExitUp: () => void;
  focused: boolean;
  onActivate: () => void;
}) {
  const payRef = useRef<HTMLButtonElement>(null);
  const [focusRounding, setFocusRounding] = useState(0);
  const [payFocused, setPayFocused] = useState(false);
  function submit(): boolean {
    if (change.isNegative()) return false;
    alert("Pembayaran berhasil (mock).");
    return true;
  }
  return (
    <section className="flex flex-none items-stretch border-t">
      <div className="max-h-[40vh] min-w-[700px] small:min-w-[500px] flex-3 shrink-0 overflow-y-auto border-r ">
        <PayStrip
          draft={draft}
          change={change}
          focusPayment={focusPayment}
          focusTop={focusTop}
          onExitUp={onExitUp}
          focused={focused}
          onActivate={onActivate}
          onFocusPay={() => payRef.current?.focus()}
          focusRounding={focusRounding}
          onSubmit={submit}
        />
      </div>
      <div className="flex min-w-0 flex-4 flex-col  gap-3">
        <div className="flex items-center px-1 justify-between">
          <Button
            ref={payRef}
            disabled={change.comparedTo(0) < 0}
            className={cn(
              "rounded-none transition-shadow",
              payFocused &&
                "shadow-lg ring-2 ring-primary ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-primary",
            )}
            onFocus={() => setPayFocused(true)}
            onBlur={() => setPayFocused(false)}
            onClick={submit}
            onKeyDown={(event) => {
              if (event.key === "ArrowUp") {
                event.preventDefault();
                onExitUp();
                return;
              }
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                setFocusRounding((count) => count + 1);
              }
            }}
          >
            Bayar
          </Button>
          <div className="flex items-center gap-2">
            <CashierName />
            <Options draft={draft} />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <Total grand={grand} fix={draft.fix} />
        </div>
      </div>
    </section>
  );
}

/**
 * The payment rows and the money readouts — the part of the purchase that used
 * to take a stage, tucked into the strip so the main panel never leaves the
 * goods. `focusPayment` counts F2 presses; the first amount field watches it.
 */
function PayStrip({
  draft,
  change,
  focusPayment,
  focusTop,
  onExitUp,
  focused,
  onActivate,
  onFocusPay,
  focusRounding,
  onSubmit,
}: {
  draft: Draft;
  change: Decimal;
  focusPayment: number;
  focusTop: number;
  onExitUp: () => void;
  focused: boolean;
  onActivate: () => void;
  onFocusPay: () => void;
  focusRounding: number;
  onSubmit: () => boolean;
}) {
  const res = useStream(service.method.get.catalogChanges);
  if (res.type !== "success") return <Loading />;
  return (
    <Body
      draft={draft}
      catalog={res.data}
      change={change}
      focusPayment={focusPayment}
      focusTop={focusTop}
      onExitUp={onExitUp}
      focused={focused}
      onActivate={onActivate}
      onFocusPay={onFocusPay}
      focusRounding={focusRounding}
      onSubmit={onSubmit}
    />
  );
}

function Body({
  draft,
  catalog,
  change,
  focusPayment,
  focusTop,
  onExitUp,
  focused,
  onActivate,
  onFocusPay,
  focusRounding,
  onSubmit,
}: {
  draft: Draft;
  catalog: MethodCatalog;
  change: Decimal;
  focusPayment: number;
  focusTop: number;
  onExitUp: () => void;
  focused: boolean;
  onActivate: () => void;
  onFocusPay: () => void;
  focusRounding: number;
  onSubmit: () => boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Methods
        draft={draft}
        catalog={catalog}
        focusPayment={focusPayment}
        focusTop={focusTop}
        onExitUp={onExitUp}
        focused={focused}
        onActivate={onActivate}
        onFocusPay={onFocusPay}
        focusRounding={focusRounding}
        onSubmit={onSubmit}
      />
      <div className="flex flex-col gap-1 border-t text-small tabular-nums">
        <div
          className={cn(
            "flex items-center justify-between gap-2",
            change.isNegative() && "text-destructive",
          )}
        >
          <span className="text-muted-foreground text-normal">
            {change.isNegative() ? "Sisa" : "Kembalian"}
          </span>
          <span className="font-bold text-change">{rupiah(change.abs(), draft.fix)}</span>
        </div>
      </div>
    </div>
  );
}
