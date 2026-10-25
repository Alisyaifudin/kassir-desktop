import { useMemo, useState } from "react";
import Decimal from "decimal.js";
import {
  linesSubtotal,
  paidTotal,
  purchaseTotal,
  roundMoney,
  transactionGrandTotal,
} from "~/lib/purchase";
import { pageData } from "./data";
import { service } from "~/services";
import { Draft, STAGES, type Stage } from "./Draft";
import { Bottom } from "./z-Bottom";
import { useStage } from "~/pages/cart/use-stage";
import { useDraftId } from "~/pages/cart/use-draft";
import { useCartScreen } from "~/components/cart/use-cart-screen";
import { useSubmitCart } from "~/components/cart/use-submit-cart";
import { Complete } from "~/components/cart/z-Complete";
import { CartBody, CartPanels } from "~/components/cart/z-CartFrame";
import { CartStartError } from "~/components/cart/z-StartError";

/**
 * The Pos screen: the restock screen's shape, selling instead of buying.
 *
 * Two panels. The top one assembles the sale and walks through two stages — the
 * goods, then the charges on the whole sale. The bottom one carries the payment
 * rows, the change and the grand total, and the moves between those stages:
 * because the payment never takes a stage of its own, settling a sale and
 * building one share the same strip.
 *
 * Nothing on the screen waits as a block. The four reads are registered once and
 * start together; the chrome — tab strip, `+`, F12, the search bar, `+manual`,
 * the `Tambahan` toggle, `Bayar`, the cashier, the options button, the rounding
 * field — is drawn from the first frame, and the values inside it that are data
 * (tab titles, line rows, payment rows, the grand total) fill in or pulse.
 */
export default function Page() {
  const [stage, setStage] = useStage(STAGES);
  const [draftId, setDraftId] = useDraftId();

  const sources = useMemo(
    () => ({
      drafts: service.transaction.get.changes,
      methods: service.method.get.catalogChanges,
      customers: service.customer.get.changes,
      extras: service.extra.get.changes,
    }),
    [],
  );

  return (
    <pageData.Provider sources={sources}>
      <Screen
        stage={stage}
        onStage={setStage}
        draftId={draftId}
        onDraft={setDraftId}
      />
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

  const draftsRes = pageData.use("drafts");
  const extrasRes = pageData.use("extras");
  const drafts = draftsRes.type === "success" ? draftsRes.data : [];
  // An empty list means "not read yet", not "no cart": hold the create-a-draft
  // effect until the read has actually answered — and, on a cached visit, until
  // the live subscription has confirmed the seeded list (`refetching`). Acting on
  // last visit's tabs could open a cart that was submitted since, or miss one.
  const ready = draftsRes.type === "success" && draftsRes.refetching !== true;

  const refresh = pageData.useRefresh();
  const cart = useCartScreen({
    mode: "incoming",
    drafts,
    ready,
    firstStage: "listing",
    onStage,
    draftId,
    onDraft,
    onF2: () => setFocusPayment((count) => count + 1),
  });
  const { active, lines, extras, hardIssue, submitting, complete, setComplete } = cart;

  const extrasPresets = useMemo(
    () =>
      (extrasRes.type === "success" ? extrasRes.data : []).map(
        ({ id, name, kind, value, flag }) => ({ id, name, kind, value, flag }),
      ),
    [extrasRes],
  );

  // The sale's numbers, for the strip and for the readiness rule below. `null`
  // until there is a cart to show: the strip's `Rp` and its wording stay, the
  // amount pulses.
  const grand =
    active === null
      ? null
      : roundMoney(
          transactionGrandTotal(purchaseTotal(extras, linesSubtotal(lines)), active.rounding),
          active.fix,
        );
  const change =
    active === null || grand === null
      ? new Decimal(0)
      : roundMoney(paidTotal(active.methods), active.fix).minus(grand);

  const { submitDraft } = useSubmitCart({
    activeId: active?.id ?? null,
    blocked: complete !== null || submitting || hardIssue,
    // A sale is ready when it has something to pay for and the tender covers it.
    // A sale needs something to pay for: a zero total is nothing, and a
    // negative one is a discount that outran the goods.
    ready: () => grand !== null && grand.gt(0) && !change.isNegative(),
    setSubmitting: cart.setSubmitting,
    setComplete,
    build: (recordId) => ({ recordId, total: grand ?? new Decimal(0), change, fix: active?.fix ?? 0 }),
  });

  return (
    <main className="relative flex h-full min-h-0 shrink grow basis-0 flex-col overflow-hidden">
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
        <CartPanels submitting={submitting}>
          {cart.startError !== null ? (
            <div className="p-2">
              <CartStartError message={cart.startError} onRetry={cart.retryStart} />
            </div>
          ) : draftsRes.type === "error" ? (
            // The drafts are the one read the screen cannot work without; the
            // rest of the strip stays usable and this line offers the retry.
            <div className="p-2">
              <CartStartError
                message={`Daftar transaksi gagal dimuat: ${draftsRes.error.message}`}
                onRetry={() => refresh("drafts")}
              />
            </div>
          ) : null}
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
            presets={extrasPresets}
            loading={draftsRes.type === "init" || !cart.opened}
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
            disabled={active === null || hardIssue || submitting || grand === null || !grand.gt(0)}
          />
        </CartPanels>
      </CartBody>
    </main>
  );
}
