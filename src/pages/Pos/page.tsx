import { useEffect, useMemo, useRef, useState } from "react";
import type Decimal from "decimal.js";
import { Effect, Either } from "effect";
import { toast } from "sonner";
import { Loader, useStream } from "~/components/Loader";
import { Loading } from "~/components/Loading";
import { SaveError } from "~/components/SaveError";
import { service } from "~/services";
import { STORED_FLAG, type Draft as DraftModel } from "~/services/transaction";
import { Draft, type Stage } from "./Draft";
import { Bottom } from "./z-Bottom";
import type { Extra, Line } from "~/components/cart/types";
import {
  linesSubtotal,
  paidTotal,
  purchaseTotal,
  roundMoney,
  transactionGrandTotal,
} from "~/lib/purchase";
import { useUser } from "~/hooks/use-user";
import { useStage } from "./use-stage";
import { useDraftId } from "./use-draft";
import { findLineIssues, hasHardIssue } from "~/components/cart/code-issues";
import { cartErrorMessage, run } from "~/components/cart/run";
import { CartStartError } from "~/components/cart/z-StartError";
import { Complete } from "./z-Complete";

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
 * shared link all land where they should.
 */
export default function Page() {
  const [stage, setStage] = useStage();
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
  const saleDrafts = useMemo(
    () => drafts.filter((draft) => draft.mode === "incoming").sort((a, b) => a.order - b.order),
    [drafts],
  );
  // Stored carts are parked: never the active tab, never in Ctrl+Arrow order.
  const normalDrafts = useMemo(
    () => saleDrafts.filter((draft) => (draft.flag & STORED_FLAG) === 0),
    [saleDrafts],
  );
  // The tab strip puts the parked carts first, as number-only chips.
  const tabs = useMemo(
    () =>
      [...saleDrafts].sort((a, b) => {
        const aStored = (a.flag & STORED_FLAG) === 0 ? 1 : 0;
        const bStored = (b.flag & STORED_FLAG) === 0 ? 1 : 0;
        return aStored - bStored || a.order - b.order;
      }),
    [saleDrafts],
  );
  const creating = useRef(false);
  const user = useUser();
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState<{
    recordId: string;
    total: Decimal;
    change: Decimal;
    fix: number;
  } | null>(null);
  // Batalkan rebuilds the cart asynchronously. Hold the "no tabs, make one"
  // effect until the rebuilt draft is actually in the stream, so it cannot
  // race a second empty tab into existence.
  const [restoring, setRestoring] = useState(false);
  const [restoredId, setRestoredId] = useState<string | null>(null);
  // Why the screen has no cart to show. A rejected `add.new` writes no state, so
  // the effect below would never re-run: without this the operator got a spinner
  // that never ends instead of a message and a retry.
  const [startError, setStartError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const listingRes = useStream(service.listing.get.changes);

  // Bumped by F2; the payment rows in the bottom panel watch it to put the
  // cursor on the first amount, so a sale can be settled from any stage.
  const [focusPayment, setFocusPayment] = useState(0);
  // Bumped by F1; whichever stage is on screen watches it to focus its search
  // bar. Page-level so it works even when the bottom panel has the focus.
  const [focusSearch, setFocusSearch] = useState(0);
  // Unified grid arrows: the main grid's last cell hands off down to the
  // settle grid, and its top hands off up to the main grid's last cell.
  const [focusLast, setFocusLast] = useState(0);
  const [focusBottom, setFocusBottom] = useState(0);
  // Which panel owns the selection, so only one cell is highlighted at a time.
  const [area, setArea] = useState<"main" | "bottom">("main");

  // F1 searches, F2 settles, F12 opens a new tab — from anywhere on the
  // screen, not just a panel.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (submitting) return;
      if (event.key === "F1") {
        event.preventDefault();
        setFocusSearch((count) => count + 1);
        return;
      }
      if (event.key === "F2") {
        event.preventDefault();
        setFocusPayment((count) => count + 1);
        return;
      }
      if (event.key === "F12") {
        event.preventDefault();
        void Effect.runPromise(service.transaction.add.new("incoming")).then(onDraft, (error) => {
          setStartError(cartErrorMessage(error));
        });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onDraft, submitting]);

  // The screen always has a sale to show: an empty one is made for it.
  useEffect(() => {
    if (
      normalDrafts.length > 0 ||
      creating.current ||
      complete !== null ||
      submitting ||
      restoring
    ) {
      return;
    }
    creating.current = true;
    void Effect.runPromise(service.transaction.add.new("incoming")).then(
      (id) => {
        creating.current = false;
        setStartError(null);
        onDraft(id);
      },
      (error) => {
        creating.current = false;
        setStartError(cartErrorMessage(error));
      },
    );
  }, [normalDrafts.length, onDraft, complete, submitting, restoring, retry]);

  // Once the rebuilt draft reaches the stream, the normal no-tabs guard can take
  // over again. The timeout is a safety net for a stream that never delivers.
  useEffect(() => {
    if (!restoring) return;
    if (restoredId === null) return;
    if (normalDrafts.some((draft) => draft.id === restoredId)) {
      setRestoring(false);
      setRestoredId(null);
      return;
    }
    const timer = setTimeout(() => {
      setRestoring(false);
      setRestoredId(null);
    }, 1000);
    return () => clearTimeout(timer);
  }, [restoring, restoredId, normalDrafts]);

  // A `?draft=` that is no longer open — submitted, deleted, or a link from
  // another machine — is repaired, not honoured blindly: the address bar must
  // name the cart that is actually under the cursor. (It never *changes* the
  // cart on its own: the write below replaces the history entry.)
  const active =
    (draftId !== null ? normalDrafts.find((draft) => draft.id === draftId) : undefined) ??
    normalDrafts[0] ??
    null;
  const activeId = active?.id ?? null;
  useEffect(() => {
    if (activeId === null || draftId === activeId) return;
    onDraft(activeId);
  }, [activeId, draftId, onDraft]);
  const issues = useMemo(
    () =>
      findLineIssues(
        active?.listings ?? [],
        listingRes.type === "success" ? listingRes.data : [],
      ),
    [active?.listings, listingRes],
  );
  const hardIssue = hasHardIssue(issues);

  // Switching tabs (click, Ctrl+Arrow, F12) returns to the goods with the
  // search ready. The focus token is bumped a tick later so the listing grid is
  // already mounted when it sees the change.
  const previousActive = useRef<string | null>(null);
  const handleStage = useRef(onStage);
  handleStage.current = onStage;
  useEffect(() => {
    if (activeId === null) return;
    const previous = previousActive.current;
    previousActive.current = activeId;
    if (previous === null || previous === activeId) return;
    handleStage.current("listing");
    const timer = setTimeout(() => setFocusSearch((count) => count + 1), 0);
    return () => clearTimeout(timer);
  }, [activeId]);

  // Ctrl/Cmd+Left/Right walks the open transaction tabs. Text fields keep their
  // own word-jump, so only act when the target is not an editor.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (submitting) return;
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const target = event.target as HTMLElement | null;
      // Editors keep their own keys, except the search field: tab switching is
      // still useful from there.
      const editor = target?.closest("input, textarea, [contenteditable='true']");
      if (editor != null && !(editor instanceof HTMLInputElement && editor.type === "search")) {
        return;
      }
      const index = normalDrafts.findIndex((draft) => draft.id === activeId);
      if (index === -1) return;
      const next = normalDrafts[index + (event.key === "ArrowLeft" ? -1 : 1)];
      if (next === undefined) return;
      event.preventDefault();
      onDraft(next.id);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [normalDrafts, activeId, onDraft, submitting]);

  const completeDialog =
    complete === null ? null : (
      <Complete
        recordId={complete.recordId}
        total={complete.total}
        change={complete.change}
        fix={complete.fix}
        onRestoreStart={() => {
          setRestoring(true);
          setRestoredId(null);
        }}
        onRestoreEnd={() => {
          setRestoring(false);
          setRestoredId(null);
        }}
        onRestored={(id) => {
          setRestoredId(id);
          onDraft(id);
        }}
        onClose={() => setComplete(null)}
      />
    );

  // Keep the dialog at the same child position as the main return. Without
  // this, restoring a draft flips `active` from null to a draft while
  // `complete` is still set, React remounts the dialog, and the operator sees
  // a close → open → close flash.
  if (active === null) {
    return (
      <>
        {startError === null ? (
          <Loading />
        ) : (
          <CartStartError
            message={startError}
            onRetry={() => {
              setStartError(null);
              setRetry((count) => count + 1);
            }}
          />
        )}
        {completeDialog}
      </>
    );
  }

  /** Park this cart, then jump to another open one (or let the effect make one). */
  function storeCart() {
    const id = active.id;
    const next = normalDrafts.find((draft) => draft.id !== id);
    void Effect.runPromise(Effect.either(service.transaction.set.store(id))).then((result) => {
      if (Either.isLeft(result)) {
        toast.error(result.left.message);
        return;
      }
      if (next !== undefined) onDraft(next.id);
      else onDraft(null);
    });
  }

  /** A parked tab expands back into a normal one when clicked. */
  function openDraft(id: string) {
    const draft = saleDrafts.find((candidate) => candidate.id === id);
    if (draft !== undefined && (draft.flag & STORED_FLAG) !== 0) {
      void Effect.runPromise(Effect.either(service.transaction.set.restore(id))).then((result) => {
        if (Either.isLeft(result)) {
          toast.error(result.left.message);
          return;
        }
        onDraft(id);
      });
      return;
    }
    onDraft(id);
  }

  // The cart lives in the transaction service; these are its `tx_listings` and
  // `tx_extras` rows, written back on every edit.
  const lines: Line[] = active.listings;
  const extras: Extra[] = active.extras;
  const setLines = (next: Line[]) =>
    run(service.transaction.listings.set(active.id, next));
  const setExtras = (next: Extra[]) =>
    run(service.transaction.extras.set(active.id, next));

  const subtotal = linesSubtotal(lines);
  const total = purchaseTotal(extras, subtotal);
  const grand = roundMoney(transactionGrandTotal(total, active.rounding), active.fix);
  const change = roundMoney(paidTotal(active.methods), active.fix).minus(grand);

  /** Start the commit; returns whether the click/key should be swallowed. */
  function submitDraft(): boolean {
    if (complete !== null || submitting || hardIssue || grand.isZero() || change.isNegative()) {
      return false;
    }
    (document.activeElement as HTMLElement | null)?.blur();
    setSubmitting(true);
    void Effect.runPromise(
      Effect.either(service.transaction.submit(active.id, { cashier: user.name })),
    ).then((result) => {
      setSubmitting(false);
      if (Either.isLeft(result)) {
        toast.error(result.left.message);
        return;
      }
      setComplete({ recordId: result.right, total: grand, change, fix: active.fix });
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
          drafts={tabs}
          onSelect={openDraft}
          stage={stage}
          onStage={onStage}
          focusSearch={focusSearch}
          focusLast={focusLast}
          onExitDown={() => setFocusBottom((count) => count + 1)}
          focused={area === "main"}
          onActivate={() => setArea("main")}
          lines={lines}
          onLines={setLines}
          issues={issues}
          extras={extras}
          onExtras={setExtras}
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
          onStore={storeCart}
          onSubmit={submitDraft}
          disabled={hardIssue || submitting || grand.isZero()}
        />
        {submitting ? (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60">
            <Loading />
          </div>
        ) : null}
      </div>
      {completeDialog}
    </>
  );
}