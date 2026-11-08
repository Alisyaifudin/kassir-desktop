import type { ComboDiscountKind } from "~/services/combo";
import { recalcDiscounts } from "~/lib/purchase";

export type ComboDiscountDraft = { id: string; value: number; kind: ComboDiscountKind };

/** The stack with its rupiah effect derived for the current price and quantity. */
export function deriveComboDiscounts(
  price: number,
  quantity: number,
  discounts: readonly ComboDiscountDraft[],
) {
  return recalcDiscounts(
    price,
    quantity,
    discounts.map((discount) => ({ ...discount, eff: 0, total: 0 })),
  );
}

export type ComboComponentDraft = {
  listingId: string;
  quantity: number;
  discounts: ComboDiscountDraft[];
};
