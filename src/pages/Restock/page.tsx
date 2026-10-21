import { useEffect, useMemo, useRef, useState } from "react";
import type Decimal from "decimal.js";
import { Effect, Either } from "effect";
import { toast } from "sonner";
import { Loader, useStream } from "~/components/Loader";
import { Loading } from "~/components/Loading";
import { service } from "~/services";
import type { Draft as DraftModel } from "~/services/transaction";
import { Draft, type Stage } from "./Draft";
import { Bottom } from "./z-Bottom";
import type { Extra, Line } from "./types";
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
import { findLineIssues, hasHardIssue } from "./Draft/code-issues";
import { Complete } from "./z-Complete";

/**
 * The restock screen: the sale screen's shape, buying instead of selling.
 *
 * Two panels. The top one assembles the purchase and walks through three stages
 * — the goods, the charges on the whole purchase, then the payment. The bottom
 * one carries the grand total and the moves between those stages.
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
  const purchaseDrafts = useMemo(
    () => drafts.filter((draft) => draft.mode === "outcoming").sort((a, b) => a.order - b.order),
    [drafts],
  );
  const creating = useRef(false);
  const listingRes = useStream(service.listing.get.changes);

  // Bumped by F1; whichever grid is on screen watches it to focus its search
  // bar. Page-level so F1 works from the payment stage too.
  const [focusSearch, setFocusSearch] = useState(0);
  // Bayar's hand-off back to the payment grid's rounding cell.
  const [focusRounding, setFocusRounding] = useState(0);
  // The payment grid's hand-off to the Bayar button.
  const [focusPay, setFocusPay] = useState(0);
  // Bayar's Up / the payment grid's top: return to the last listing row.
  const [focusLast, setFocusLast] = useState(0);
  const user = useUser();
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState<{
    recordId: string;
    total: Decimal;
    change: Decimal;
    fix: number;
    credit: boolean;
  } | null>(null);
  // Batalkan rebuilds the cart asynchronously; hold the no-tabs effect until
  // the restored draft reaches the stream.
  const [restoring, setRestoring] = useState(false);
  const [restoredId, setRestoredId] = useState<string | null>(null);

  // F1 searches; F12 starts another purchase draft.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (submitting) return;
      if (event.key === "F1") {
        event.preventDefault();
        if (stage === "payment") {
          onStage("listing");
          // Let the listing grid mount before the token lands on it.
          setTimeout(() => setFocusSearch((count) => count + 1), 0);
        } else {
          setFocusSearch((count) => count + 1);
        }
        return;
      }
      if (event.key === "F12") {
        event.preventDefault();
        void Effect.runPromise(service.transaction.add.new("outcoming")).then(onDraft, () => {});
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onDraft, onStage, stage, submitting]);

  // The screen always has a purchase to show: an empty one is made for it.
  useEffect(() => {
    if (
      purchaseDrafts.length > 0 ||
      creating.current ||
      complete !== null ||
      submitting ||
      restoring
    ) {
      return;
    }
    creating.current = true;
    void Effect.runPromise(service.transaction.add.new("outcoming")).then(
      (id) => {
        creating.current = false;
        onDraft(id);
      },
      () => {
        creating.current = false;
      },
    );
  }, [purchaseDrafts.length, onDraft, complete, submitting, restoring]);

  // Once the rebuilt draft reaches the stream, the normal no-tabs guard can take
  // over again. The timeout is a safety net for a stream that never delivers.
  useEffect(() => {
    if (!restoring) return;
    if (restoredId === null) return;
    if (purchaseDrafts.some((draft) => draft.id === restoredId)) {
      setRestoring(false);
      setRestoredId(null);
      return;
    }
    const timer = setTimeout(() => {
      setRestoring(false);
      setRestoredId(null);
    }, 1000);
    return () => clearTimeout(timer);
  }, [restoring, restoredId, purchaseDrafts]);

  const active = purchaseDrafts.find((draft) => draft.id === draftId) ?? purchaseDrafts[0] ?? null;
  const activeId = active?.id ?? null;
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

  // Ctrl/Cmd+Left/Right walks the open purchase tabs. Text fields keep their
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
      const index = purchaseDrafts.findIndex((draft) => draft.id === activeId);
      if (index === -1) return;
      const next = purchaseDrafts[index + (event.key === "ArrowLeft" ? -1 : 1)];
      if (next === undefined) return;
      event.preventDefault();
      onDraft(next.id);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [purchaseDrafts, activeId, onDraft, submitting]);

  const completeDialog =
    complete === null ? null : (
      <Complete
        recordId={complete.recordId}
        total={complete.total}
        change={complete.change}
        fix={complete.fix}
        credit={complete.credit}
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

  // Keep the dialog at the same sibling position as the main return so it does
  // not remount when a cancelled purchase restores a draft.
  if (active === null) return <><Loading />{completeDialog}</>;

  // The cart lives in the transaction service; these are its `tx_listings` and
  // `tx_extras` rows, written back on every edit.
  const lines: Line[] = active.listings;
  const extras: Extra[] = active.extras;
  const setLines = (next: Line[]) =>
    void Effect.runFork(service.transaction.listings.set(active.id, next));
  const setExtras = (next: Extra[]) =>
    void Effect.runFork(service.transaction.extras.set(active.id, next));

  const subtotal = linesSubtotal(lines);
  const total = purchaseTotal(extras, subtotal);
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
    setSubmitting(true);
    const result = await Effect.runPromise(
      Effect.either(service.transaction.submit(active.id, { cashier: user.name, credit })),
    );
    setSubmitting(false);
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

  return (
    <>
      <div
        className="relative flex h-full min-h-0 flex-col gap-2 overflow-x-hidden pt-1"
        inert={submitting}
      >
        <Draft
          draft={active}
          drafts={purchaseDrafts}
          onSelect={onDraft}
          stage={stage}
          onStage={onStage}
          grand={grand}
          lines={lines}
          onLines={setLines}
          issues={issues}
          extras={extras}
          onExtras={setExtras}
          focusSearch={focusSearch}
          focusRounding={focusRounding}
          onFocusPay={() => setFocusPay((count) => count + 1)}
          focusLast={focusLast}
          onExitUp={exitUp}
          onCredit={() => runSubmit(true)}
          creditDisabled={hardIssue || creditGrand.isZero()}
        />
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
      {completeDialog}
    </>
  );
}
