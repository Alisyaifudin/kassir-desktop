import { createAtom } from "@xstate/store";
import { useAtom } from "@xstate/store/react";
import { HandCoins } from "lucide-react";
import { Loading } from "~/components/Loading";

const store = createAtom<null | number>(null);

export function useSummary() {
  const v = useAtom(store);
  return [v, store.set] as const;
}

export const setSummary = store.set;

export function Summary() {
  const [debt] = useSummary();
  if (debt === null) return <Loading />;
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
          <HandCoins size={22} />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-muted-foreground">Total Utang</span>
          <span className="text-small text-muted-foreground">
            Akumulasi seluruh piutang pelanggan
          </span>
        </div>
      </div>
      <p className="text-end text-big font-bold tabular-nums">
        Rp{debt.toLocaleString("id-ID")}
      </p>
    </div>
  );
}
