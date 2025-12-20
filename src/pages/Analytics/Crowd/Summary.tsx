import { createAtom } from "@xstate/store";
import { useAtom } from "@xstate/store/react";
import { Loading } from "~/components/Loading";

const store = createAtom({
  loading: true,
  daily: 0,
  weekly: 0,
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
      <p>Harian: {summary.daily}</p>
      <p>Mingguan: {summary.weekly}</p>
    </div>
  );
}
