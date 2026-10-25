import Decimal from "decimal.js";
import { Either, Effect } from "effect";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader, useMutation, useStream } from "~/components/Loader";
import { Loading } from "./z-Loading";
import { useUser } from "~/hooks/use-user";
import { generateId } from "~/lib/random";
import { useDraftId } from "~/pages/cart/use-draft";
import { service } from "~/services";
import type { RecordAdjustmentInput } from "~/services/record";
import { ADJUSTMENT_CART_FLAG, type Draft, type DraftExtra } from "~/services/transaction";
import { Bottom } from "./z-Bottom";
import { Complete } from "./z-Complete";
import { Lines } from "./z-Lines";
import { Tabs } from "./z-Tabs";
import { run } from "~/components/cart/run";

/**
 * `/transaction` — an arbitrary record, typed by hand.
 *
 * Much simpler than Pos on purpose: no catalog, no search, no stages, no
 * precision, no customer. Each open tab is a real `tx_records` row flagged
 * `ADJUSTMENT_CART_FLAG` (see FLAGS.md): its lines are the tab's `tx_extras`
 * (kind `number`), its direction is `tx_record_mode`, its note and its one
 * payment live beside them. Committing it writes `record.add.adjustment` — a
 * `records` row flagged `RECORD_FLAG_ADJUSTMENT`, with extras and no stock —
 * and then deletes the tab, because working state has become history.
 *
 * The tab is the source of truth: every edit goes straight to the service, and
 * the screen renders whatever the stream hands back. Switching tabs is therefore
 * free, and a dragged-in `?draft=` opens the right one.
 */

/** A tab belongs to this screen when its flag carries the adjustment bit. */
function isAdjustmentTab(draft: Draft): boolean {
  return (draft.flag & ADJUSTMENT_CART_FLAG) !== 0;
}

/** One empty line: what the grid starts with, and what "+"/F1 appends. */
function blankLine(): DraftExtra {
  return { id: generateId(), name: "", value: 0, kind: "number", flag: 0 };
}

export default function Page() {
  const res = useStream(service.transaction.get.changes);

  return (
    <main className="flex h-full min-h-0 shrink grow basis-0 flex-col overflow-hidden">
      <Loader res={res} fallback={<Loading />}>
        {({ data }) => <Screen drafts={data.filter(isAdjustmentTab)} />}
      </Loader>
    </main>
  );
}

function Screen({ drafts }: { drafts: Draft[] }) {
  const user = useUser();
  const [draftId, setDraftId] = useDraftId();
  const [complete, setComplete] = useState<{ recordId: string; total: Decimal } | null>(null);
  const creating = useRef(false);

  const active = drafts.find((draft) => draft.id === draftId) ?? drafts[0] ?? null;
  const extras = active?.extras ?? [];
  const total = extras.reduce((sum, extra) => sum.add(extra.value), new Decimal(0));
  const totalNumber = total.toNumber();
  const methodId = active?.methods[0]?.methodId ?? null;

  const { pending, mutate } = useMutation((input: RecordAdjustmentInput) =>
    service.record.add.adjustment(input),
  );

  // This screen always has a tab to type into. It is created once the stream
  // reports none — after a commit deleted the last one, too.
  useEffect(() => {
    if (drafts.length > 0 || creating.current) return;
    creating.current = true;
    void Effect.runPromise(
      Effect.either(service.transaction.add.new("incoming", ADJUSTMENT_CART_FLAG)),
    ).then((result) => {
      creating.current = false;
      if (Either.isLeft(result)) {
        toast.error(result.left.message);
        return;
      }
      setDraftId(result.right);
    });
  }, [drafts.length, setDraftId]);

  // The grid always keeps one line to type into — the same invariant `removeLine`
  // enforces. A cart that arrives with no lines (just created, or emptied from
  // another window) gets its first row here; without it the screen drew an empty
  // grid with no way in but F1.
  useEffect(() => {
    if (active === null || extras.length > 0) return;
    run(service.transaction.extras.set(active.id, [blankLine()]));
    // `active` is a new object on every stream emission; the id and the row count
    // are what decide whether there is anything to seed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id, extras.length]);

  // A `?draft=` that names a tab which is no longer open is repaired, never
  // honoured blindly: the URL must name the tab under the cursor.
  useEffect(() => {
    if (active === null || draftId === active.id) return;
    setDraftId(active.id);
  }, [active, draftId, setDraftId]);

  // The tab strip shows what the tab is for: its first named line.
  const title = extras.find((extra) => extra.name.trim() !== "")?.name.trim() ?? "Transaksi Baru";
  useEffect(() => {
    if (active === null || active.title === title) return;
    run(service.transaction.set.title(active.id, title));
  }, [active, title]);

  // The tab's single payment always equals its total; the row exists so the
  // chosen account survives a tab switch, and it is what `Simpan` reads.
  useEffect(() => {
    if (active === null || methodId === null) return;
    const method = active.methods[0];
    if (method !== undefined && method.value === totalNumber) return;
    run(
      service.transaction.methods.set(active.id, [
        { id: method?.id ?? generateId(), methodId, value: totalNumber },
      ]),
    );
  }, [active, methodId, totalNumber]);

  function setExtras(next: DraftExtra[]) {
    if (active === null) return;
    run(service.transaction.extras.set(active.id, next));
  }

  function addLine() {
    if (active === null) return;
    setExtras([...extras, blankLine()]);
  }

  function patchLine(id: string, next: Partial<DraftExtra>) {
    setExtras(extras.map((extra) => (extra.id === id ? { ...extra, ...next } : extra)));
  }

  function removeLine(id: string) {
    // The grid always keeps one line to type into.
    if (extras.length === 1) {
      const only = extras[0];
      if (only !== undefined) setExtras([{ ...only, name: "", value: 0 }]);
      return;
    }
    setExtras(extras.filter((extra) => extra.id !== id));
  }

  function addTab() {
    void Effect.runPromise(
      Effect.either(service.transaction.add.new("incoming", ADJUSTMENT_CART_FLAG)),
    ).then((result) => {
      if (Either.isLeft(result)) {
        toast.error(result.left.message);
        return;
      }
      setDraftId(result.right);
    });
  }

  function deleteTab(id: string) {
    const index = drafts.findIndex((draft) => draft.id === id);
    const neighbour = drafts[index + 1] ?? drafts[index - 1] ?? null;
    run(service.transaction.delete.byId(id));
    if (neighbour !== null) setDraftId(neighbour.id);
  }

  async function submit() {
    if (active === null || methodId === null) return;
    const result = await mutate({
      mode: active.mode,
      cashier: user.name,
      note: active.note,
      methodId,
      extras: extras.map((extra) => ({ name: extra.name, value: extra.value })),
    });
    if (Either.isLeft(result)) {
      toast.error(result.left.message);
      return;
    }
    setComplete({ recordId: result.right, total });
    // The tab has become a record; its working state is spent.
    run(service.transaction.delete.byId(active.id));
  }

  return (
    <>
      <Tabs
        drafts={drafts}
        activeId={active?.id ?? null}
        onSelect={setDraftId}
        onCreate={addTab}
        onDelete={deleteTab}
      />

      {active === null ? (
        <Loading />
      ) : (
        <>
          <Lines extras={extras} onAdd={addLine} onChange={patchLine} onRemove={removeLine} />
          <Bottom
            total={total}
            note={active.note}
            onNote={(note) => run(service.transaction.set.note(active.id, note))}
            mode={active.mode}
            onMode={(mode) => run(service.transaction.set.mode(active.id, mode))}
            methodId={methodId}
            onMethod={(methodId) =>
              run(
                service.transaction.methods.set(active.id, [
                  {
                    id: active.methods[0]?.id ?? generateId(),
                    methodId,
                    value: totalNumber,
                  },
                ]),
              )
            }
            pending={pending}
            onSubmit={() => void submit()}
          />
        </>
      )}

      {complete === null ? null : (
        <Complete
          recordId={complete.recordId}
          total={complete.total}
          onClose={() => setComplete(null)}
        />
      )}
    </>
  );
}
