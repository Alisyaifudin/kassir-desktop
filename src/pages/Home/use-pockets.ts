import { useStream } from "~/components/Loader";
import { service } from "~/services";

/**
 * The pocket catalog with each pocket's latest balance — the same source /money
 * reads, so the two screens can never disagree about what is in the till.
 *
 * Mounted only for admins (see `z-Figures`): `/money` redirects cashiers, and a
 * cashier must not be able to read the balances from Beranda instead.
 */
export function usePockets() {
  return useStream(service.money.pockets.get.changes);
}
