import { useMemo, useState } from "react";
import Decimal from "decimal.js";
import {
  linesSubtotal,
  paidTotal,
  purchaseTotal,
  roundMoney,
  transactionGrandTotal,
} from "~/lib/purchase";
import { Draft, STAGES, type Stage } from "./Draft";
import { Bottom } from "./z-Bottom";
import { useStage } from "~/pages/cart/use-stage";
import { useDraftId } from "~/pages/cart/use-draft";
import { useCartScreen } from "~/components/cart/use-cart-screen";
import { useSubmitCart } from "~/components/cart/use-submit-cart";
import { Complete } from "~/components/cart/z-Complete";
import { CartBody, CartPanels } from "~/components/cart/z-CartFrame";
import { CartStartError } from "~/components/cart/z-StartError";
import { pageData } from "./data";
import { service } from "~/services";

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
 * — the draft lifecycle, the tab walker, the shortcuts, what "Bayar" means and
 * the shell — lives in `useCartScreen`, `useSubmitCart` and `z-CartFrame`; what
 * is left here is the purchase's own three-stage layout.
 *
 * Nothing waits as a block: `drafts`, `methods` and `suppliers` are registered on
 * one provider and start together, so the tab strip, the grid, the stage moves
 * and `Bayar` are drawn from the first frame — like Pos.
 */
export default function Page() {
  const [stage, setStage] = useStage(STAGES);
  const [draftId, setDraftId] = useDraftId();

  const sources = useMemo(
    () => ({
      drafts: service.transaction.get.changes,
      methods: service.method.get.catalogChanges,
      suppliers: service.supplier.get.changes,
    }),
    [],
  );

  return (
    <pageData.Provider sources={sources}>
      <Screen stage={stage} onStage={setStage} draftId={draftId} onDraft={setDraftId} />
    </pageData.Provider>
  );
}

function Screen({
  stage,
  onStage,
  draftId,
  onDraft,
}: {
  stage: Stage;
  onStage: (stage: Stage) => void;
  draftId: string | null;
  onDraft: (id: string | null) => void;
}) {
  // Bumped by F2; the payment stage watches it to put the cursor on its first
  // amount, even when it is already the open stage.
  const [focusPayment, setFocusPayment] = useState(0);
  // Bayar's hand-off back to the payment grid's rounding cell.
  const [focusRounding, setFocusRounding] = useState(0);
  // The payment grid's hand-off to the Bayar button.
  const [focusPay, setFocusPay] = useState(0);
  // Bayar's Up / the payment grid's top: return to the last listing row.
  const [focusLast, setFocusLast] = useState(0);

  const draftsRes = pageData.use("drafts");
  const drafts = draftsRes.type === "success" ? draftsRes.data : [];
  // An empty list means "not read yet", not "no cart": hold the create-a-draft
  // effect until the read has actually answered.
  const ready = draftsRes.type === "success";
  const refresh = pageData.useRefresh();

  const cart = useCartScreen<Stage, CreditComplete>({
    mode: "outcoming",
    drafts,
    ready,
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

  const total = purchaseTotal(extras, linesSubtotal(lines));
  // `null` while there is no cart: the strip's `Rp` and labels stay, the amount
  // pulses, and `Bayar` waits disabled.
  const grand =
    active === null
      ? null
      : roundMoney(transactionGrandTotal(total, active.rounding), active.fix);
  // A credit purchase pays the goods and their charges; the rounding-off line is
  // the cash settlement's, not the debt's.
  const creditGrand = active === null ? null : roundMoney(total, active.fix);
  const change =
    active === null || grand === null
      ? new Decimal(0)
      : roundMoney(paidTotal(active.methods), active.fix).minus(grand);

  const { submit, submitDraft } = useSubmitCart({
    activeId: active?.id ?? null,
    blocked: complete !== null || submitting || hardIssue,
    // A credit sale has no change to settle; a cash one may not be underpaid.
    ready: (credit) =>
      (credit
        ? creditGrand !== null && creditGrand.gt(0)
        : grand !== null && grand.gt(0)) && (credit || !change.isNegative()),
    setSubmitting: cart.setSubmitting,
    setComplete,
    build: (recordId, credit) => ({
      recordId,
      total: (credit ? creditGrand : grand) ?? new Decimal(0),
      change,
      fix: active?.fix ?? 0,
      credit,
    }),
  });

  /** Leave the payment grid for the last row of the goods. */
  function exitUp() {
    onStage("listing");
    setTimeout(() => setFocusLast((count) => count + 1), 0);
  }

  return (
    <CartBody
      dialog={
        complete === null ? null : (
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
        )
      }
    >
      <CartPanels submitting={submitting}>
        {cart.startError !== null ? (
          <div className="p-2">
            <CartStartError message={cart.startError} onRetry={cart.retryStart} />
          </div>
        ) : draftsRes.type === "error" ? (
          <div className="p-2">
            <CartStartError
              message={`Daftar pembelian gagal dimuat: ${draftsRes.error.message}`}
              onRetry={() => refresh("drafts")}
            />
          </div>
        ) : null}
        <Draft
          draft={active}
          drafts={cart.tabs}
          onSelect={cart.openDraft}
          stage={stage}
          loading={draftsRes.type === "init"}
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
          onCredit={() => submit(true)}
          creditDisabled={hardIssue || creditGrand === null || !creditGrand.gt(0)}
        />
        <Bottom
          stage={stage}
          onChange={onStage}
          grand={grand}
          fix={active?.fix ?? 0}
          change={change}
          disabled={active === null || hardIssue || grand === null || !grand.gt(0)}
          focusPay={focusPay}
          onFocusRounding={() => setFocusRounding((count) => count + 1)}
          onExitUp={exitUp}
          onSubmit={() => submitDraft(false)}
        />
      </CartPanels>
    </CartBody>
  );
}
