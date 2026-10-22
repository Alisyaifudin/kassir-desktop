import { Either } from "effect";
import { useNavigate } from "react-router";
import { useMutation } from "~/components/Loader";
import { service } from "~/services";
import type { RecordMode } from "~/services/record";

/** Where a copied record's cart opens: a sale settles on Pos, a purchase on Restock. */
const cartOf = { incoming: "/pos", outcoming: "/restock" } as const;

/**
 * Copying a record back into a cart. The service rebuilds it — lines, discounts,
 * charges, payments, pictures — as a new `tx_records` draft and leaves the
 * record alone, so this only has to open the cart it made. `?draft=` is how the
 * cart screen names the tab it shows, so the operator lands on the copy instead
 * of whichever cart happened to be first.
 */
export function useToDraft(recordId: string, mode: RecordMode) {
  const navigate = useNavigate();
  const { pending, error, mutate } = useMutation(service.transaction.add.fromRecord);

  async function copy() {
    const result = await mutate(recordId);
    if (Either.isRight(result)) navigate(`${cartOf[mode]}?draft=${result.right}`);
  }

  return { loading: pending, error: error?.message ?? null, copy } as const;
}
