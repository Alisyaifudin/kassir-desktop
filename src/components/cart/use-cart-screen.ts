import { useEffect, useMemo, useRef, useState } from "react";
import type Decimal from "decimal.js";
import { Effect, Either } from "effect";
import { toast } from "sonner";
import { useDelayedFlag, useStream } from "~/components/Loader";
import { service } from "~/services";
import {
  ADJUSTMENT_CART_FLAG,
  STORED_FLAG,
  type Draft as DraftModel,
} from "~/services/transaction";
import type { Extra, Line } from "~/components/cart/types";
import { findLineIssues, hasHardIssue } from "~/components/cart/code-issues";
import { cartErrorMessage, run } from "~/components/cart/run";
import { isScreenOwnedByDialog } from "~/hooks/use-dialog-lock";
import type { PaidMethod } from "~/components/cart/paid-methods";

/** The fields every cart screen's completion dialog needs to be rendered. */
type Completed = {
  recordId: string;
  total: Decimal;
  change: Decimal;
  fix: number;
  /** What was tendered, per method: the completion dialog itemises a split. */
  methods: PaidMethod[];
};

type CartMode = "incoming" | "outcoming";

/** Where the device remembers which cart was open — one key per screen mode. */
const LAST_DRAFT_KEY = (mode: CartMode) => `cart.last-draft.${mode}`;

/**
 * Everything the Pos and the Restock screens do *around* the cart grid, in one
 * place: which drafts of this mode exist, which one is open, the guard that
 * always keeps one open, the latch that waits for a restored one, the `?draft=`
 * repair, the cart this screen opens with, the tab walker, and the commit flags.
 *
 * The two screens differ only in what they render (a sale's bottom strip versus
 * a purchase's stage stepper) and in what F1/F2/F3 mean there, so those stay
 * props. Everything here is identical on both screens by construction — that is
 * the point: a keyboard or lifecycle rule must not exist twice.
 */
export function useCartScreen<S extends string, C extends Completed = Completed>({
  mode,
  drafts,
  firstStage,
  onStage,
  draftId,
  onDraft,
  onF1,
  onF2,
  onF3,
  ready = true,
}: {
  mode: CartMode;
  drafts: DraftModel[];
  /**
   * False while the drafts are still being read. The "always keep a cart open"
   * effect must not fire then: an empty list means "not read yet", not "no cart",
   * and creating one would race the read into a duplicate tab.
   */
  ready?: boolean;
  /** The stage the panel returns to when the operator switches tabs. */
  firstStage: S;
  onStage: (stage: S) => void;
  draftId: string | null;
  onDraft: (id: string | null) => void;
  /**
   * F1: the goods. The bump function is handed in so a screen that has to change
   * stage first (and wait a tick for the grid to mount) can defer it; without a
   * handler the hook simply bumps and the open stage's search bar takes it.
   */
  onF1?: (focusSearch: () => void) => void;
  /**
   * F2: the charges. Same contract as `onF1` — a purchase opens its extras stage
   * on the way, a sale has both stages side by side and only moves the cursor.
   */
  onF2?: (focusSearch: () => void) => void;
  /** F3: settling. A purchase opens its payment stage; a sale has no F3. */
  onF3?: () => void;
}) {
  const modeDrafts = useMemo(
    () =>
      drafts
        // `/transaction` tabs live in the same table but are not sale/purchase
        // carts; without the mask they would appear here as an extra tab.
        .filter((draft) => draft.mode === mode && (draft.flag & ADJUSTMENT_CART_FLAG) === 0)
        .sort((a, b) => a.order - b.order),
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

  // F1/F2/F3/F12 work from anywhere on the screen, not just from the focused
  // panel. No dependency array on purpose: the handlers close over the screen's
  // own callbacks and `startNew`, so they must be re-registered after every
  // render.
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
        if (onF2 === undefined) focusSearchNow();
        else onF2(focusSearchNow);
        return;
      }
      if (event.key === "F3") {
        event.preventDefault();
        onF3?.();
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
      !ready ||
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
  }, [ready, normalDrafts.length, onDraft, complete, submitting, restoring, retry, mode]);

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

  // The tab this screen opens with when the address bar names nothing.
  //
  // The device remembers the cart that was open, per mode, in the store — so it
  // survives leaving the screen, a refresh and a restart. `?draft=` still wins
  // when it names an open cart; a remembered cart that was closed or parked is
  // not found; with nothing remembered the newest tab wins. (It used to be the
  // *oldest* one, which meant every return rewound to tab one, because every
  // route back to the screen — the topbar, Beranda's tiles, the `0` shortcut —
  // is a bare path with no `?draft=` on it.)
  const [rememberedId, setRememberedId] = useState<string | null>(null);
  // Nothing is chosen before the store has answered: opening the newest tab and
  // hopping to the remembered one a few milliseconds later would be a tab
  // switch nobody asked for. The screens read `opened` as part of their loading
  // state, so the undecided frame draws their placeholders (invisible for the
  // anti-flash window) instead of a strip with no tab selected. The timeout is
  // the backstop: a store that never answers must not leave the till without a
  // cart.
  const [rememberedReady, setRememberedReady] = useState(false);
  const fallbackDue = useDelayedFlag(true, 400);
  const rememberKey = LAST_DRAFT_KEY(mode);
  useEffect(() => {
    let alive = true;
    void Effect.runPromise(
      service.store.get<unknown>(rememberKey).pipe(
        Effect.match({
          onFailure: () => null,
          onSuccess: (value) => (typeof value === "string" ? value : null),
        }),
      ),
    ).then((id) => {
      if (!alive) return;
      // A cart opened by `?draft=` during this mount is the one under the
      // cursor: a late read must not pull it back to last time's cart.
      setRememberedId((current) => current ?? id);
      setRememberedReady(true);
    });
    return () => {
      alive = false;
    };
  }, [rememberKey]);

  const opened = rememberedReady || fallbackDue;
  const newest = normalDrafts[normalDrafts.length - 1] ?? null;
  const lastOpen =
    rememberedId === null ? undefined : normalDrafts.find((draft) => draft.id === rememberedId);

  // A `?draft=` that is no longer open — submitted, deleted, or a link from
  // another machine — is repaired, not honoured blindly: the address bar must
  // name the cart that is actually under the cursor. (It never *changes* the
  // cart on its own: `useDraftId` replaces the history entry.)
  const named = draftId !== null ? normalDrafts.find((draft) => draft.id === draftId) : undefined;
  const active = named ?? lastOpen ?? (opened ? newest : null);
  const activeId = active?.id ?? null;
  // A cached visit seeds the draft list before the live read confirms it. The
  // repair below writes the address bar, so it waits for `ready`: a `?draft=`
  // naming a cart that was submitted since must not be answered with it.
  useEffect(() => {
    if (!ready || activeId === null || draftId === activeId) return;
    onDraft(activeId);
  }, [ready, activeId, draftId, onDraft]);

  // The cart under the cursor is the one this device remembers, so leaving the
  // screen for Beranda and coming back lands on the sale being rung up instead
  // of rewinding to tab one.
  useEffect(() => {
    // Same reason: the device remembers the cart the operator was on, and a
    // seeded (unconfirmed) list must not teach it a dead one.
    if (!ready || activeId === null || activeId === rememberedId) return;
    setRememberedId(activeId);
    void Effect.runPromise(service.store.set(rememberKey, activeId).pipe(Effect.ignore));
  }, [ready, activeId, rememberedId, rememberKey]);

  const issues = useMemo(
    () =>
      findLineIssues(active?.listings ?? [], listingRes.type === "success" ? listingRes.data : []),
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
    /** False until the screen knows which cart it opens with — part of its loading state. */
    opened,
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
