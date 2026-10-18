import { useEffect, useMemo, useRef } from "react";
import { Effect } from "effect";
import { Loader, useStream } from "~/components/Loader";
import { Loading } from "~/components/Loading";
import { service } from "~/services";
import type { Draft as DraftModel } from "~/services/transaction";
import { Draft, type Stage } from "./Draft";
import { Bottom } from "./z-Bottom";
import { grandTotal, paidTotal } from "./total";
import { useStage } from "./use-stage";
import { useDraftId } from "./use-draft";

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

  // The screen always has a purchase to show: an empty one is made for it.
  useEffect(() => {
    if (purchaseDrafts.length > 0 || creating.current) return;
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
  }, [purchaseDrafts.length, onDraft]);

  const active =
    purchaseDrafts.find((draft) => draft.id === draftId) ??
    purchaseDrafts.find((draft) => (draft.flag & 1) === 1) ??
    purchaseDrafts[0] ??
    null;
  const activeId = active?.id ?? null;

  // Remember the open tab so a relaunch returns to it.
  useEffect(() => {
    if (activeId === null) return;
    void Effect.runFork(service.transaction.set.active(activeId));
  }, [activeId]);

  if (active === null) return <Loading />;

  const grand = grandTotal(active.rounding);
  const change = paidTotal(active.methods) - grand;
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-x-hidden pt-1">
      <Draft
        draft={active}
        drafts={purchaseDrafts}
        onSelect={onDraft}
        stage={stage}
        grand={grand}
      />
      <Bottom stage={stage} onChange={onStage} grand={grand} fix={active.fix} change={change} />
    </div>
  );
}
