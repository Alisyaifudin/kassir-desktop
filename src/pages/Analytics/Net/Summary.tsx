import { createAtom } from "@xstate/store";
import { useAtom } from "@xstate/store/react";
import { Loading } from "~/components/Loading";

const store = createAtom({
  loading: true,
  profit: 0,
});

export function useSummary() {
  const v = useAtom(store);
  return [v, store.set] as const;
}

export function Summary() {
  const [summary] = useSummary();
  if (summary.loading) return <Loading />;
  return (
    <div className="flex flex-col">
      <p>Untung Total:</p>
      <p className="text-end">Rp{summary.profit.toLocaleString("id-ID")}</p>
    </div>
  );
}
