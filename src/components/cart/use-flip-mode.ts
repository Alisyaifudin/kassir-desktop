import { Either, Effect } from "effect";
import { useNavigate } from "react-router";
import { useMutation } from "~/components/Loader";
import { service } from "~/services";
import { STORED_FLAG, type DraftMode } from "~/services/transaction";

/** Where a cart of each mode is assembled: a sale on Pos, a purchase on Restock. */
const cartOf: Record<DraftMode, string> = { incoming: "/pos", outcoming: "/restock" };

/**
 * Flipping an open cart to the other screen's side: a sale becomes a purchase
 * (Pos → Restock), a purchase becomes a sale (Restock → Pos).
 *
 * Nothing is copied. The draft *is* the working state — unlike a written record,
 * which the mode change has to re-create — so `set.mode` moves the same
 * `tx_records` row, with its lines, charges, payments and pictures, to the other
 * screen's tab strip. The mode is the only thing that decides which screen shows
 * a cart, so the flip itself is what makes the cart change hands; all that is
 * left here is to follow it, because staying put would leave the cashier on a
 * screen whose tab strip no longer holds the cart under the cursor.
 *
 * `?draft=` is how a cart screen names the tab it shows, so the operator lands
 * on the flipped cart instead of whichever one happens to be first.
 */
export function useFlipMode(id: string) {
  const navigate = useNavigate();
  const { pending, error, mutate } = useMutation((mode: DraftMode) =>
    Effect.gen(function* () {
      yield* service.transaction.set.mode(id, mode);
      // A parked cart is not opened by `?draft=`: the target screen only names
      // tabs that are not stored, so a flipped park would land on another cart
      // and the flip would look lost. Unpark it as part of the flip — the
      // operator asked to work on *this* cart, on the other screen.
      const drafts = yield* service.transaction.get.drafts(mode);
      const flipped = drafts.find((draft) => draft.id === id);
      if (flipped !== undefined && (flipped.flag & STORED_FLAG) !== 0) {
        yield* service.transaction.set.restore(id);
      }
    }),
  );

  async function flip(mode: DraftMode) {
    const result = await mutate(mode);
    // A refused write leaves the cart where it was, so there is nowhere to go.
    if (Either.isLeft(result)) return;
    navigate(`${cartOf[mode]}?draft=${id}`);
  }

  return { loading: pending, error: error?.message ?? null, flip } as const;
}
