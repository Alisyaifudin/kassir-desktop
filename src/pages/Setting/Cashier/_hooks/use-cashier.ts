import { useAsync } from "~/hooks/useAsync";
import { useDB } from "~/RootLayout";

export const FETCH_CASHIER = "fetch-cashiers";

export function useCashier() {
  const db = useDB();
	const state = useAsync(() => db.cashier.get(), [FETCH_CASHIER]);
  return state;
}