import { useState } from "react";
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

/**
 * The Pos screen: the restock screen's shape, selling instead of buying.
 *
 * Two panels. The top one assembles the sale and walks through two stages — the
 * goods, then the charges on the whole sale. The bottom one carries the payment
 * rows, the change and the grand total, and the moves between those stages:
 * because the payment never takes a stage of its own, settling a sale and
 * building one share the same strip.
 *
 * The open draft and the stage both live in the URL, so refresh, back and a
 * shared link all land where they should. Everything the screen shares with
 * Restock lives in `useCartScreen`.
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
  // Bumped by F2; the payment rows in the bottom panel watch it to put the
  // cursor on the first amount, so a sale can be settled from any stage.
  const [focusPayment, setFocusPayment] = useState(0);
  // Unified grid arrows: the main grid's last cell hands off down to the
  // settle grid, and its top hands off up to the main grid's last cell.
  const [focusLast, setFocusLast] = useState(0);
  const [focusBottom, setFocusBottom] = useState(0);
  // Which panel owns the selection, so only one cell is highlighted at a time.
  // Only Pos needs it: both of its grids are on screen at once, while Restock
  // shows one stage at a time.
  const [area, setArea] = useState<"main" | "bottom">("main");

  const cart = useCartScreen({
    mode: "incoming",
    drafts,
    firstStage: "listing",
    onStage,
    draftId,
    onDraft,
    onF2: () => setFocusPayment((count) => count + 1),
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

  const grand = roundMoney(
    transactionGrandTotal(purchaseTotal(extras, linesSubtotal(lines)), active.rounding),
    active.fix,
  );
  const change = roundMoney(paidTotal(active.methods), active.fix).minus(grand);

  /**
   * The dialog is rendered at the same child position in both returns. Without
   * that, restoring a draft flips `active` from null to a draft while `complete`
   * is still set, React remounts the dialog, and the operator sees a
   * close → open → close flash.
   */
  function completeDialog() {
    if (complete === null) return null;
    return (
      <Complete
        mode="sale"
        recordId={complete.recordId}
        total={complete.total}
        change={complete.change}
        fix={complete.fix}
        onRestoreStart={cart.restore.onStart}
        onRestoreEnd={cart.restore.onEnd}
        onRestored={cart.restore.onRestored}
        onClose={() => setComplete(null)}
      />
    );
  }

  /** Start the commit; returns whether the click/key should be swallowed. */
  function submitDraft(): boolean {
    if (complete !== null || submitting || hardIssue || grand.isZero() || change.isNegative()) {
      return false;
    }
    (document.activeElement as HTMLElement | null)?.blur();
    cart.setSubmitting(true);
    void Effect.runPromise(
      Effect.either(service.transaction.submit(active.id, { cashier: user.name })),
    ).then((result) => {
      cart.setSubmitting(false);
      if (Either.isLeft(result)) {
        toast.error(result.left.message);
        return;
      }
      setComplete({
        recordId: result.right,
        total: grand,
        change,
        fix: active.fix,
      });
    });
    return true;
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
          onStage={onStage}
          focusSearch={cart.focusSearch}
          focusLast={focusLast}
          onExitDown={() => setFocusBottom((count) => count + 1)}
          focused={area === "main"}
          onActivate={() => setArea("main")}
          lines={lines}
          onLines={cart.setLines}
          issues={cart.issues}
          extras={extras}
          onExtras={cart.setExtras}
        />
        <SaveError />
        <Bottom
          draft={active}
          grand={grand}
          change={change}
          focusPayment={focusPayment}
          focusTop={focusBottom}
          onExitUp={() => setFocusLast((count) => count + 1)}
          focused={area === "bottom"}
          onActivate={() => setArea("bottom")}
          onStore={cart.storeCart}
          onSubmit={submitDraft}
          disabled={hardIssue || submitting || grand.isZero()}
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
