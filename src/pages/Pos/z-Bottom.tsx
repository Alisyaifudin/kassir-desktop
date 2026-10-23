import { useRef, useState } from "react";
import Decimal from "decimal.js";
import { Loader, useStream } from "~/components/Loader";
import { Skeleton } from "~/components/ui/skeleton";
import { createErrorBoundary } from "~/components/createErrorBoundary";
import { cn } from "~/lib/utils";
import { service } from "~/services";
import { MethodError, type MethodCatalog } from "~/services/method";
import type { Draft } from "~/services/transaction";
import { rupiah } from "~/components/cart/util-rupiah";
import { Methods } from "~/components/cart/z-Methods";
import { Options } from "./Draft/z-Options";
import { Total } from "~/components/cart/z-Total";
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
  onStore,
  onSubmit,
  disabled,
}: {
  draft: Draft;
  grand: Decimal;
  change: Decimal;
  focusPayment: number;
  focusTop: number;
  onExitUp: () => void;
  focused: boolean;
  onActivate: () => void;
  onStore: () => void;
  /** Starts the commit; false while the sale cannot be paid (hard errors). */
  onSubmit: () => boolean;
  disabled: boolean;
}) {
  const payRef = useRef<HTMLButtonElement>(null);
  const [focusRounding, setFocusRounding] = useState(0);
  const [payFocused, setPayFocused] = useState(false);
  function submit(): boolean {
    if (disabled || change.isNegative()) return false;
    return onSubmit();
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
            disabled={disabled || change.comparedTo(0) < 0}
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
            <Options draft={draft} onStore={onStore} />
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
 *
 * The catalogue read goes through `<Loader>`, so a failed read is a `MethodError`
 * — caught by the boundary below and reported with a retry — instead of the
 * endless spinner this strip used to show, which read as "the app is thinking"
 * on the one screen where the sale could never be paid.
 */
type PayStripProps = {
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
};

const MethodErrorBoundary = createErrorBoundary(MethodError);

function PayStrip(props: PayStripProps) {
  // Remounting re-subscribes the stream, which is the cheapest retry there is.
  const [attempt, setAttempt] = useState(0);
  return (
    <MethodErrorBoundary
      key={attempt}
      fallback={({ error }) => (
        <div
          role="alert"
          className="flex flex-col items-start gap-2 border-b border-destructive/40 bg-destructive/10 p-3 text-small"
        >
          <span>Daftar metode pembayaran gagal dimuat: {error.message}</span>
          <span className="text-muted-foreground">
            Penjualan belum bisa dibayar sampai metode pembayaran terbaca.
          </span>
          <Button size="sm" variant="outline" onClick={() => setAttempt((count) => count + 1)}>
            Coba lagi
          </Button>
        </div>
      )}
    >
      <PayStripView {...props} />
    </MethodErrorBoundary>
  );
}

function PayStripView(props: PayStripProps) {
  const res = useStream(service.method.get.catalogChanges);
  return (
    <Loader res={res} fallback={<PaymentLoading />}>
      {({ data }) => <Body {...props} catalog={data} />}
    </Loader>
  );
}

/** The payment strip's own shape while the method catalogue loads. */
function PaymentLoading() {
  return (
    <div className="flex min-w-0 flex-col gap-2 p-2" aria-busy="true" aria-label="Memuat metode">
      <div className="flex gap-1">
        <Skeleton className="h-14 flex-3" />
        <Skeleton className="h-14 flex-3" />
        <Skeleton className="h-14 flex-5" />
      </div>
      <div className="flex items-center justify-between gap-2 border-t pt-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-24" />
      </div>
    </div>
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
