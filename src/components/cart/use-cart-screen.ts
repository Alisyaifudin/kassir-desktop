import { useEffect, useMemo, useRef, useState } from "react";
import type Decimal from "decimal.js";
import { Effect, Either } from "effect";
import { toast } from "sonner";
import { useStream } from "~/components/Loader";
import { service } from "~/services";
import { STORED_FLAG, type Draft as DraftModel } from "~/services/transaction";
import type { Extra, Line } from "~/components/cart/types";
import { findLineIssues, hasHardIssue } from "~/components/cart/code-issues";
import { cartErrorMessage, run } from "~/components/cart/run";
import { isScreenOwnedByDialog } from "~/components/cart/use-inert-app";

/** The fields every cart screen's completion dialog needs to be rendered. */
export type Completed = {
  recordId: string;
  total: Decimal;
  change: Decimal;
  fix: number;
};

export type CartMode = "incoming" | "outcoming";

/**
 * Everything the Pos and the Restock screens do *around* the cart grid, in one
 * place: which drafts of this mode exist, which one is open, the guard that
 * always keeps one open, the latch that waits for a restored one, the `?draft=`
 * repair, the tab walker, and the commit flags.
 *
 * The two screens differ only in what they render (a sale's bottom strip versus
 * a purchase's stage stepper) and in what F2 means there, so those stay props.
 * Everything here is identical on both screens by construction — that is the
 * point: a keyboard or lifecycle rule must not exist twice.
 */
/** The object `useCartScreen` hands a screen (or the shared cart frame). */
export type CartScreen = ReturnType<typeof useCartScreen>;

export function useCartScreen<S extends string, C extends Completed = Completed>({
  mode,
  drafts,
  firstStage,
  onStage,
  draftId,
  onDraft,
  onF1,
  onF2,
}: {
  mode: CartMode;
  drafts: DraftModel[];
  /** The stage the panel returns to when the operator switches tabs. */
  firstStage: S;
  onStage: (stage: S) => void;
  draftId: string | null;
  onDraft: (id: string | null) => void;
  /**
   * F1: put the cursor in the search bar of whichever grid is on screen. The
   * bump function is handed in so a screen that has to change stage first (and
   * wait a tick for the grid to mount) can defer it; without a handler the hook
   * simply bumps.
   */
  onF1?: (focusSearch: () => void) => void;
  /** F2: settle. Each screen decides what settling means for its layout. */
  onF2?: () => void;
}) {
  const modeDrafts = useMemo(
    () => drafts.filter((draft) => draft.mode === mode).sort((a, b) => a.order - b.order),
    [drafts, mode],
  );
  // Stored carts are parked: never the active tab, never in Ctrl+Arrow order.
  const normalDrafts = useMemo(
    () => modeDrafts.filter((draft) => (draft.flag & STORED_FLAG) === 0),
    [modeDrafts],
  );
  // The tab strip puts the parked carts first, as number-only chips.
  const tabs = useMemo(
    () =>
      [...modeDrafts].sort((a, b) => {
        const aStored = (a.flag & STORED_FLAG) === 0 ? 1 : 0;
        const bStored = (b.flag & STORED_FLAG) === 0 ? 1 : 0;
        return aStored - bStored || a.order - b.order;
      }),
    [modeDrafts],
  );

  const creating = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState<C | null>(null);
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
  /** Bumped whenever a grid should take the cursor: F1, a tab switch, and the
   * screens' own hand-offs. Whichever stage is on screen watches it. */
  const [focusSearch, setFocusSearch] = useState(0);
  const focusSearchNow = () => setFocusSearch((count) => count + 1);
  const listingRes = useStream(service.listing.get.changes);

  /** Start a fresh draft of this mode, reporting a failure on the screen. */
  function startNew() {
    void Effect.runPromise(service.transaction.add.new(mode)).then(onDraft, (error) => {
      setStartError(cartErrorMessage(error));
    });
  }

  // F1/F2/F12 work from anywhere on the screen, not just from the focused panel.
  // No dependency array on purpose: the handlers close over the screen's own
  // callbacks and `startNew`, so they must be re-registered after every render.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (submitting) return;
      // A dialog owns the screen: the completion dialog, or either money editor.
      // `inert` on `#root` and the focus trap hold the pointer in, but neither
      // stops a listener on `window`, so F12 could add an empty draft behind the
      // "Pembayaran berhasil" dialog and F1 could reset the grid selection under
      // an open editor.
      if (isScreenOwnedByDialog()) return;
      if (event.key === "F1") {
        event.preventDefault();
        if (onF1 === undefined) focusSearchNow();
        else onF1(focusSearchNow);
        return;
      }
      if (event.key === "F2") {
        event.preventDefault();
        onF2?.();
        return;
      }
      if (event.key === "F12") {
        event.preventDefault();
        startNew();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // The screen always has a cart to show: an empty one is made for it.
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
    void Effect.runPromise(service.transaction.add.new(mode)).then(
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
  }, [normalDrafts.length, onDraft, complete, submitting, restoring, retry, mode]);

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
  // cart on its own: `useDraftId` replaces the history entry.)
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
  const firstStageRef = useRef(firstStage);
  firstStageRef.current = firstStage;
  useEffect(() => {
    if (activeId === null) return;
    const previous = previousActive.current;
    previousActive.current = activeId;
    if (previous === null || previous === activeId) return;
    handleStage.current(firstStageRef.current);
    const timer = setTimeout(() => setFocusSearch((count) => count + 1), 0);
    return () => clearTimeout(timer);
  }, [activeId]);

  // Ctrl/Cmd+Left/Right walks the open tabs. Text fields keep their own
  // word-jump, so only act when the target is not an editor.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (submitting || isScreenOwnedByDialog()) return;
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

  /** Park this cart, then jump to another open one (or let the effect make one). */
  function storeCart() {
    if (active === null) return;
    const id = active.id;
    const next = normalDrafts.find((draft) => draft.id !== id);
    void Effect.runPromise(Effect.either(service.transaction.set.store(id))).then((result) => {
      if (Either.isLeft(result)) {
        toast.error(result.left.message);
        return;
      }
      onDraft(next?.id ?? null);
    });
  }

  /** A parked tab expands back into a normal one when clicked. */
  function openDraft(id: string) {
    const draft = modeDrafts.find((candidate) => candidate.id === id);
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
  const lines: Line[] = active?.listings ?? [];
  const extras: Extra[] = active?.extras ?? [];
  const setLines = (next: Line[]) => {
    if (active === null) return;
    run(service.transaction.listings.set(active.id, next));
  };
  const setExtras = (next: Extra[]) => {
    if (active === null) return;
    run(service.transaction.extras.set(active.id, next));
  };

  // The open cart takes its name from its first named line, so the tab strip
  // says "Kopi" instead of "Transaksi Baru". Sale and purchase are the same rule
  // (".name" is whatever was rung up), so it lives here rather than in both
  // Draft panels.
  const title = (active?.listings ?? []).find((line) => line.name.trim() !== "")?.name.trim();
  const cartTitle = title ?? "Transaksi Baru";
  const currentTitle = active?.title;
  useEffect(() => {
    if (activeId === null || currentTitle === undefined) return;
    if (cartTitle !== currentTitle) run(service.transaction.set.title(activeId, cartTitle));
  }, [activeId, cartTitle, currentTitle]);

  /** The restore latch the completion dialog drives when it rebuilds a cart. */
  const restore = {
    onStart: () => {
      setRestoring(true);
      setRestoredId(null);
    },
    onEnd: () => {
      setRestoring(false);
      setRestoredId(null);
    },
    onRestored: (id: string) => {
      setRestoredId(id);
      onDraft(id);
    },
  };

  return {
    drafts: modeDrafts,
    normalDrafts,
    tabs,
    active,
    activeId,
    lines,
    extras,
    setLines,
    setExtras,
    issues,
    hardIssue,
    submitting,
    setSubmitting,
    complete,
    setComplete,
    startError,
    retryStart: () => {
      setStartError(null);
      setRetry((count) => count + 1);
    },
    focusSearch,
    focusSearchNow,
    startNew,
    storeCart,
    openDraft,
    restore,
  };
}
