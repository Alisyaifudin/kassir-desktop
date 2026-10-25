import { useRef, useState } from "react";
import Decimal from "decimal.js";
import { Skeleton, SkeletonText } from "~/components/ui/skeleton";
import { ReservedSkeleton } from "~/components/page-data";
import { cn } from "~/lib/utils";
import type { MethodCatalog } from "~/services/method";
import { pageData } from "./data";
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
  /** `null` while the drafts load: the strip's chrome is drawn anyway. */
  draft: Draft | null;
  /** `null` while there is no draft to total; the amount pulses. */
  grand: Decimal | null;
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
    if (draft === null || disabled || change.isNegative()) return false;
    return onSubmit();
  }
  return (
    <section className="flex flex-none items-stretch border-t">
      {/* No `max-h` + `overflow-y-auto` here: the strip has a fixed number of
          rows (Pembulatan, one method row, Kembalian), so its height is known
          and small — the `40vh` cap only ever bit on a short window, where it
          turned the whole payment column into a scroll box. The panel sizes to
          its content instead, and the goods grid above (flex-1, min-h-0) gives
          up the difference. */}
      <div className="min-w-[700px] small:min-w-[500px] flex-3 shrink-0 border-r">
        {draft === null ? (
          // The strip's shape is reserved from the first frame but drawn only
          // after the anti-flash window: the drafts usually answer in a few
          // milliseconds, so grey bands over the whole strip would be a flash,
          // while dropping the reservation would resize the bottom panel and
          // with it the goods grid above.
          <ReservedSkeleton>
            <PaymentLoading />
          </ReservedSkeleton>
        ) : (
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
        )}
      </div>
      <div className="flex min-w-0 flex-4 flex-col  gap-3">
        <div className="flex items-center px-1 justify-between">
          <Button
            ref={payRef}
            disabled={draft === null || disabled || change.comparedTo(0) < 0}
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
          <Total grand={grand} fix={draft?.fix ?? 0} />
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
 * The catalogue is the page's `methods` key, so it loads beside the drafts
 * instead of after them. A failed read keeps the strip's place and offers the
 * same retry (`refresh` re-subscribes just this key) rather than taking the till
 * down: nothing else on the screen depends on it.
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

function PayStrip(props: PayStripProps) {
  const res = pageData.use("methods");
  const refresh = pageData.useRefresh();

  // The strip itself is chrome — the rounding row, the change row, their labels —
  // so it is drawn as soon as the draft exists. `catalog: null` keeps the method
  // rows a placeholder inside `Methods`, and a failed read is one line under the
  // strip that re-reads just this key.
  const catalog = res.type === "success" ? res.data : null;

  return (
    <>
      <Body {...props} catalog={catalog} />
      {res.type !== "error" ? null : (
        <div className="flex flex-wrap items-center gap-2 border-t px-2 pb-2 text-small text-destructive">
          <span role="alert">Daftar metode pembayaran gagal dimuat: {res.error.message}</span>
          <Button size="sm" variant="outline" onClick={() => refresh("methods")}>
            Coba lagi
          </Button>
        </div>
      )}
    </>
  );
}

/**
 * The strip before the first draft exists. Only the values can be missing here:
 * `Pembulatan`, `Kembalian` and the row structure are written down, so they are
 * drawn at once instead of being replaced by a grey block. (The rounding field
 * needs a draft to write to, which is why it is a placeholder until the cart
 * arrives — a field that cannot save is worse than an honest pulse.)
 */
function PaymentLoading() {
  return (
    <div className="flex min-w-0 flex-col" aria-busy="true" aria-label="Memuat pembayaran">
      <div className="flex flex-col items-end border-b px-2">
        <span className="text-small text-muted-foreground select-none">Pembulatan</span>
        <Skeleton className="w-full h-[40px] small:h-[30px] rounded-none" />
      </div>
      <div className="p-1">
        <Skeleton className="h-[73px] w-full small:h-[56px] rounded-none" />
      </div>
      <div className="flex items-center justify-between gap-2 border-t px-2 pt-2 pb-1">
        <SkeletonText className=" w-full max-w-[120px] rounded-none" />
        <SkeletonText className="w-full max-w-[400px] small:max-w-[300px] small:h-[70px] h-[80px]" />
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
  /** `null` while the method catalogue loads; the rounding row is still usable. */
  catalog: MethodCatalog | null;
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
