import { useCallback } from "react";
import { Effect } from "effect";
import { toast } from "sonner";
import { service } from "~/services";
import type { Combo } from "~/services/combo";

/**
 * Expands one combo into the open cart, on either cart screen.
 *
 * The listing and Extra values are read now, not when the combo was saved: a
 * template is a set of references, and the POS/Restock cart is the ordinary
 * snapshot it expands into. A component or Extra that disappeared in the
 * meantime is an error the operator can see rather than a silently partial
 * bundle.
 */
export function useAddCombo(activeId: string | null) {
  return useCallback(
    async (combo: Combo) => {
      if (activeId === null) {
        toast.error("Transaksi belum siap.");
        return;
      }
      try {
        const [listings, extras] = await Promise.all([
          Effect.runPromise(service.listing.get.all()),
          Effect.runPromise(service.extra.get.all()),
        ]);
        const listingById = new Map(listings.map((listing) => [listing.id, listing]));
        const extraById = new Map(extras.map((extra) => [extra.id, extra]));
        const components = combo.components.map((component) => {
          const listing = listingById.get(component.listingId);
          if (listing === undefined) {
            throw new Error("Satu atau lebih listing combo sudah tidak tersedia.");
          }
          return {
            listing,
            quantity: component.quantity,
            discounts: component.discounts.map(({ value, kind }) => ({ value, kind })),
          };
        });
        const comboExtras = combo.extras.map((item) => {
          const extra = extraById.get(item.extraId);
          if (extra === undefined) {
            throw new Error("Satu atau lebih biaya atau potongan combo sudah tidak tersedia.");
          }
          return extra;
        });
        await Effect.runPromise(
          service.transaction.add.combo(activeId, {
            components: components.map(({ listing, quantity, discounts }) => ({
              listingId: listing.id,
              productId: listing.productId,
              name: listing.name,
              code: listing.code,
              kind: listing.kind,
              unit: listing.unit,
              price: listing.price,
              cover: listing.cover,
              quantity,
              discounts,
            })),
            extras: comboExtras.map(({ name, kind, value, flag }) => ({
              name,
              kind,
              value,
              flag,
            })),
          }),
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal menambahkan combo ke transaksi.");
      }
    },
    [activeId],
  );
}
