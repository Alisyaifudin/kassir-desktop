import { createAtom } from "@xstate/store";
import { useAtom } from "@xstate/store/react";
import { Loading } from "~/components/Loading";

const store = createAtom({
  loading: true,
  revenue: 0,
  debt: 0,
  spending: 0,
});

export function useSummary() {
  const v = useAtom(store);
  return [v, store.set] as const;
}

export function Summary() {
  const [summary] = useSummary();
  if (summary.loading) return <Loading />;
  return (
    <div className="flex flex-col gap-2">
      <p>Pemasukan Total:</p>
      <p className="text-end">Rp{summary.revenue.toLocaleString("id-ID")}</p>
      <p>Pengeluaran Total:</p>
      <p className="text-end">Rp{(summary.spending - summary.debt).toLocaleString("id-ID")}</p>
      <p>Utang Total:</p>
      <p className="text-end">Rp{summary.debt.toLocaleString("id-ID")}</p>
    </div>
  );
}
