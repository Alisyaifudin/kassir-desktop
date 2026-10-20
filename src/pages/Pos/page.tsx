import { useEffect, useMemo, useRef, useState } from "react";
import { Effect } from "effect";
import { Loader, useStream } from "~/components/Loader";
import { Loading } from "~/components/Loading";
import { service } from "~/services";
import type { Draft as DraftModel } from "~/services/transaction";
import { Draft, type Stage } from "./Draft";
import { Bottom } from "./z-Bottom";
import { EXTRAS, LINES, type Extra, type Line } from "./mock";
import { linesSubtotal, paidTotal, purchaseTotal, transactionGrandTotal } from "./total";
import { useStage } from "./use-stage";
import { useDraftId } from "./use-draft";

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
  const creating = useRef(false);

  // The sale's contents are still mock state, held here so the bottom panel and
  // the extras stage read the same totals.
  const [lines, setLines] = useState<Line[]>(() => [...LINES]);
  const [extras, setExtras] = useState<Extra[]>(() => [...EXTRAS]);

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
        void Effect.runPromise(service.transaction.add.new("incoming")).then(onDraft, () => {});
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onDraft]);

  // The screen always has a sale to show: an empty one is made for it.
  useEffect(() => {
    if (saleDrafts.length > 0 || creating.current) return;
    creating.current = true;
    void Effect.runPromise(service.transaction.add.new("incoming")).then(
      (id) => {
        creating.current = false;
        onDraft(id);
      },
      () => {
        creating.current = false;
      },
    );
  }, [saleDrafts.length, onDraft]);

  const active =
    saleDrafts.find((draft) => draft.id === draftId) ??
    saleDrafts.find((draft) => (draft.flag & 1) === 1) ??
    saleDrafts[0] ??
    null;
  const activeId = active?.id ?? null;

  // Remember the open tab so a relaunch returns to it.
  useEffect(() => {
    if (activeId === null) return;
    void Effect.runFork(service.transaction.set.active(activeId));
  }, [activeId]);

  if (active === null) return <Loading />;

  const subtotal = linesSubtotal(lines);
  const total = purchaseTotal(extras, subtotal);
  const grand = transactionGrandTotal(total, active.rounding);
  const change = paidTotal(active.methods).minus(grand);
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-x-hidden pt-1">
      <Draft
        draft={active}
        drafts={saleDrafts}
        onSelect={onDraft}
        stage={stage}
        onStage={onStage}
        focusSearch={focusSearch}
        focusLast={focusLast}
        onExitDown={() => setFocusBottom((count) => count + 1)}
        focused={area === "main"}
        onActivate={() => setArea("main")}
        lines={lines}
        onLines={setLines}
        extras={extras}
        onExtras={setExtras}
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
      />
    </div>
  );
}