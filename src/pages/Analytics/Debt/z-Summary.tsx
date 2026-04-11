import { createAtom } from "@xstate/store";
import { useAtom } from "@xstate/store/react";
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
    <div className="flex flex-col gap-2">
      <p>Total Utang:</p>
      <p className="text-end">Rp{debt.toLocaleString("id-ID")}</p>
    </div>
  );
}
