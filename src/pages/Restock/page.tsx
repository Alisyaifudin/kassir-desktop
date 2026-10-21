import { useState } from "react";
import type Decimal from "decimal.js";
import { Effect, Either } from "effect";
import { toast } from "sonner";
import { Loader, useStream } from "~/components/Loader";
import { Loading } from "~/components/Loading";
import { SaveError } from "~/components/SaveError";
import { service } from "~/services";
import type { Draft as DraftModel } from "~/services/transaction";
import { Draft, STAGES, type Stage } from "./Draft";
import { Bottom } from "./z-Bottom";
import {
  linesSubtotal,
  paidTotal,
  purchaseTotal,
  roundMoney,
  transactionGrandTotal,
} from "~/lib/purchase";
import { useUser } from "~/hooks/use-user";
import { useStage } from "~/pages/cart/use-stage";
import { useDraftId } from "~/pages/cart/use-draft";
import { useCartScreen } from "~/components/cart/use-cart-screen";
import { CartStartError } from "~/components/cart/z-StartError";
import { Complete } from "~/components/cart/z-Complete";

/** A committed purchase, plus how it was settled — the receipt needs to know. */
type CreditComplete = {
  recordId: string;
  total: Decimal;
  change: Decimal;
  fix: number;
  credit: boolean;
};

/**
 * The restock screen: the sale screen's shape, buying instead of selling.
 *
 * Two panels. The top one assembles the purchase and walks through three stages
 * — the goods, the charges on the whole purchase, then the payment. The bottom
 * one carries the grand total and the moves between those stages.
 *
 * The open draft and the stage both live in the URL, so refresh, back and a
 * shared link all land where they should. Everything the screen shares with Pos
 * — the draft lifecycle, the tab walker, the shortcuts — lives in
 * `useCartScreen`; what is left here is the purchase's own three-stage layout.
 */
export default function Page() {
  const [stage, setStage] = useStage(STAGES);
  const [draftId, setDraftId] = useDraftId();
  const res = useStream(service.transaction.get.changes);
  return (
    <main className="relative flex h-full min-h-0 shrink grow basis-0 flex-col overflow-hidden">
      <Loader res={res} fallback={<Loading />}>
        {({ data }) => (
          <Screen
            drafts={data}
            stage={stage}
            onStage={setStage}
            draftId={draftId}
            onDraft={setDraftId}
          />
        )}
      </Loader>
    </main>
  );
}

function Screen({
  drafts,
  stage,
  onStage,
  draftId,
  onDraft,
}: {
  drafts: DraftModel[];
  stage: Stage;
  onStage: (stage: Stage) => void;
  draftId: string | null;
  onDraft: (id: string | null) => void;
}) {
  const user = useUser();
  // Bumped by F2; the payment stage watches it to put the cursor on its first
  // amount, even when it is already the open stage.
  const [focusPayment, setFocusPayment] = useState(0);
  // Bayar's hand-off back to the payment grid's rounding cell.
  const [focusRounding, setFocusRounding] = useState(0);
  // The payment grid's hand-off to the Bayar button.
  const [focusPay, setFocusPay] = useState(0);
  // Bayar's Up / the payment grid's top: return to the last listing row.
  const [focusLast, setFocusLast] = useState(0);

  const cart = useCartScreen<Stage, CreditComplete>({
    mode: "outcoming",
    drafts,
    firstStage: "listing",
    onStage,
    draftId,
    onDraft,
    // F1 from the payment stage has to leave it first, and the listing grid only
    // takes the cursor once it is mounted — hence the deferred bump.
    onF1: (focusSearch) => {
      if (stage === "payment") {
        onStage("listing");
        setTimeout(focusSearch, 0);
      } else {
        focusSearch();
      }
    },
    // F2 settles from anywhere: open the payment stage and put the cursor on its
    // first amount — the same meaning it has on Pos, where the rows are inline.
    onF2: () => {
      onStage("payment");
      setFocusPayment((count) => count + 1);
    },
  });
  const { active, lines, extras, hardIssue, submitting, complete, setComplete } = cart;

  if (active === null) {
    return (
      <>
        {cart.startError === null ? (
          <Loading />
        ) : (
          <CartStartError message={cart.startError} onRetry={cart.retryStart} />
        )}
        {completeDialog()}
      </>
    );
  }

  const total = purchaseTotal(extras, linesSubtotal(lines));
  const grand = roundMoney(transactionGrandTotal(total, active.rounding), active.fix);
  const creditGrand = roundMoney(total, active.fix);
  const change = roundMoney(paidTotal(active.methods), active.fix).minus(grand);

  /** Leave the payment grid for the last row of the goods. */
  function exitUp() {
    onStage("listing");
    setTimeout(() => setFocusLast((count) => count + 1), 0);
  }

  function canSubmit(credit: boolean): boolean {
    return (
      complete === null &&
      !submitting &&
      !hardIssue &&
      !(credit ? creditGrand.isZero() : grand.isZero()) &&
      (credit || !change.isNegative())
    );
  }

  /** Start the commit; returns the failure message for the credit dialog. */
  async function runSubmit(credit: boolean): Promise<string | null> {
    if (!canSubmit(credit)) return "Transaksi belum siap untuk disimpan.";
    (document.activeElement as HTMLElement | null)?.blur();
    cart.setSubmitting(true);
    const result = await Effect.runPromise(
      Effect.either(service.transaction.submit(active.id, { cashier: user.name, credit })),
    );
    cart.setSubmitting(false);
    if (Either.isLeft(result)) {
      toast.error(result.left.message);
      return result.left.message;
    }
    setComplete({
      recordId: result.right,
      total: credit ? creditGrand : grand,
      change,
      fix: active.fix,
      credit,
    });
    return null;
  }

  /** Start the commit; returns whether the click/key should be swallowed. */
  function submitDraft(credit = false): boolean {
    if (!canSubmit(credit)) return false;
    void runSubmit(credit);
    return true;
  }

  /**
   * Rendered at the same child position in both returns so restoring a draft
   * does not remount the dialog mid-restore.
   */
  function completeDialog() {
    if (complete === null) return null;
    return (
      <Complete
        mode="purchase"
        recordId={complete.recordId}
        total={complete.total}
        change={complete.change}
        fix={complete.fix}
        credit={complete.credit}
        onRestoreStart={cart.restore.onStart}
        onRestoreEnd={cart.restore.onEnd}
        onRestored={cart.restore.onRestored}
        onClose={() => setComplete(null)}
      />
    );
  }

  return (
    <>
      <div
        className="relative flex h-full min-h-0 flex-col gap-2 overflow-x-hidden pt-1"
        inert={submitting}
      >
        <Draft
          draft={active}
          drafts={cart.tabs}
          onSelect={cart.openDraft}
          stage={stage}
          grand={grand}
          lines={lines}
          onLines={cart.setLines}
          issues={cart.issues}
          extras={extras}
          onExtras={cart.setExtras}
          focusSearch={cart.focusSearch}
          focusPayment={focusPayment}
          focusRounding={focusRounding}
          onFocusPay={() => setFocusPay((count) => count + 1)}
          focusLast={focusLast}
          onExitUp={exitUp}
          onCredit={() => runSubmit(true)}
          creditDisabled={hardIssue || creditGrand.isZero()}
        />
        <SaveError />
        <Bottom
          stage={stage}
          onChange={onStage}
          grand={grand}
          fix={active.fix}
          change={change}
          disabled={hardIssue || grand.isZero()}
          focusPay={focusPay}
          onFocusRounding={() => setFocusRounding((count) => count + 1)}
          onExitUp={exitUp}
          onSubmit={() => submitDraft(false)}
        />
        {submitting ? (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60">
            <Loading />
          </div>
        ) : null}
      </div>
      {completeDialog()}
    </>
  );
}
