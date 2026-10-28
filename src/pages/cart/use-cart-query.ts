import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { z } from "zod";

/**
 * The cart screen's own state — which cart is open, and which step of building
 * it is showing — in React, mirrored into the address bar as `?draft=` and
 * `?stage=`.
 *
 * The address bar is still the *entry* point: a refresh, a shared link and the
 * `?draft=` a Record hands over all land on the right cart and step, because the
 * state starts from the URL. But the state, not the URL, is what the screen
 * renders from — and this is the whole point of the hook. A URL write is a
 * router navigation, which react-router wraps in `startTransition`; the cart's
 * own writes are not urgent either, so **nothing** in the renderer keeps them in
 * order.
 *
 * That ordering is exactly what broke "Pembelian berhasil": closing the dialog
 * set the stage back to the goods, and the replacement cart's id arrived a tick
 * later from `transaction.add.new`. Each write rebuilt the whole query from the
 * copy its hook had been handed when it rendered — `setSearchParams`' functional
 * form is handed that snapshot, not the live URL — so the second write put
 * `?stage=payment` back and, being the router's last navigation, won. The screen
 * stayed on the payment grid with the dialog closed.
 *
 * Two consequences shape the code below:
 *
 *  - **One writer.** `?stage=` and `?draft=` are written by one hook instance,
 *    from one effect, so a write can never resurrect the value it does not own.
 *    Two hooks over one query string cannot be made to compose.
 *  - **State first.** The setters are plain `useState` updates in the urgent
 *    lane, so the grid the cashier sees changes on the next commit no matter
 *    what the router is doing; the mirror can lag or lose and nothing visible
 *    depends on it. The URL catches up on the render after the state moved.
 *
 * The write **replaces** the history entry. This is transient UI state, not a
 * navigation: every tab switch, stage toggle, F12 and park would otherwise push
 * a `?draft=`/`?stage=` entry, so Back (and Alt+Left, and a mouse's back button)
 * would rewind through the carts of the sale being rung up instead of leaving
 * the screen — silently putting a *different* open cart under the cursor.
 */
export function useCartQuery<S extends string>(
  stages: readonly [S, ...S[]],
): {
  stage: S;
  draftId: string | null;
  setStage: (stage: S) => void;
  setDraftId: (id: string | null) => void;
} {
  const params = useCartParams(stages);
  // `stages` is given, so the state was read from it: it is always a stage.
  return { ...params, stage: params.stage as S };
}

/**
 * The open cart on its own, for the screens that have no steps to walk (the
 * adjustment cart in `Transaction`). Same state-plus-mirror, so its writes are
 * as orderly as `useCartQuery`'s — it is a second writer only on a screen where
 * nothing else writes the query.
 */
export function useDraftId() {
  const { draftId, setDraftId } = useCartParams(null);
  return [draftId, setDraftId] as const;
}

/**
 * The state both hooks above keep, in one place so the mirror is written once.
 *
 * `null` means the screen has no stages: no `?stage=` is read and none is
 * written, so a stage param left in the URL by another screen is not adopted.
 */
function useCartParams<S extends string>(stages: readonly [S, ...S[]] | null) {
  const [search, setSearch] = useSearchParams();
  const [stage, setStage] = useState<S | undefined>(() =>
    stages === null ? undefined : readStage(search.get("stage"), stages),
  );
  const [draftId, setDraftId] = useState<string | null>(() => search.get("draft"));
  const staged = stages !== null;

  useEffect(() => {
    // Start from the query the router has committed, so params this hook does
    // not own (`url_back`, say) survive the write, and touch only our own.
    const next = new URLSearchParams(search);
    if (staged) {
      if (stage === undefined) next.delete("stage");
      else next.set("stage", stage);
    }
    if (draftId === null) next.delete("draft");
    else next.set("draft", draftId);
    if (next.toString() === search.toString()) return;
    setSearch(next, { replace: true });
  }, [search, setSearch, staged, stage, draftId]);

  return { stage, draftId, setStage, setDraftId };
}

/**
 * An unknown value in a stale link falls back to the first stage: the stage list
 * is the screen's own (`Pos` toggles between goods and extras, `Restock` adds a
 * payment stage), so the URL cannot be trusted to name one of them.
 */
function readStage<S extends string>(value: string | null, stages: readonly [S, ...S[]]): S {
  return z.enum(stages).catch(stages[0]).parse(value);
}
