import { createAtom } from "@xstate/store";
import { useAtom } from "@xstate/store/react";
import { Loading } from "~/components/Loading";
import { useMode } from "./use-mode";
import { Show } from "~/components/Show";

const store = createAtom({
  loading: true,
  product: 0,
  profit: 0,
});

export function useSummary() {
  const v = useAtom(store);
  return [v, store.set] as const;
}

export function Summary() {
  const [summary] = useSummary();
  const [mode] = useMode();
  if (summary.loading) return <Loading />;
  return (
    <div className="flex flex-col gap-1">
      <p>Produk: {summary.product}</p>
      <Show when={mode === "sell"}>
        <p>Untung: Rp{summary.profit.toLocaleString("id-ID")}</p>
      </Show>
    </div>
  );
}
