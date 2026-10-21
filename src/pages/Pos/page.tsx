import { useState } from "react";
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
import { CartBody, CartEmpty, CartPanels, CartRoute } from "~/components/cart/z-CartFrame";
import type { Draft as DraftModel } from "~/services/transaction";

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
 * Restock lives in `useCartScreen` (state), `useSubmitCart` (what "Bayar"
 * means) and `z-CartFrame` (the shell).
 */
export default function Page() {
  const [stage, setStage] = useStage(STAGES);
  const [draftId, setDraftId] = useDraftId();
  return (
    <CartRoute>
      {(drafts) => (
        <Screen
          drafts={drafts}
          stage={stage}
          onStage={setStage}
          draftId={draftId}
          onDraft={setDraftId}
        />
      )}
    </CartRoute>
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

  // The sale's numbers, for the strip and for the readiness rule below. Zero
  // while there is no cart to show.
  const grand =
    active === null
      ? new Decimal(0)
      : roundMoney(
          transactionGrandTotal(purchaseTotal(extras, linesSubtotal(lines)), active.rounding),
          active.fix,
        );
  const change =
    active === null ? new Decimal(0) : roundMoney(paidTotal(active.methods), active.fix).minus(grand);

  const { submitDraft } = useSubmitCart({
    activeId: active?.id ?? null,
    blocked: complete !== null || submitting || hardIssue,
    // A sale is ready when it has something to pay for and the tender covers it.
    ready: () => !grand.isZero() && !change.isNegative(),
    setSubmitting: cart.setSubmitting,
    setComplete,
    build: (recordId) => ({ recordId, total: grand, change, fix: active?.fix ?? 0 }),
  });

  return (
    <CartBody
      dialog={
        complete === null ? null : (
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
        )
      }
    >
      {active === null ? (
        <CartEmpty cart={cart} />
      ) : (
        <CartPanels submitting={submitting}>
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
        </CartPanels>
      )}
    </CartBody>
  );
}
