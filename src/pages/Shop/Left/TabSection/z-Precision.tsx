import { queue } from "../../utils/queue";
import { tx } from "~/transaction-effect";
import { basicStore, useFix } from "../../use-transaction";
import { useTab } from "../../use-tab";

export function Precision() {
  const fix = useFix();
  const [tab] = useTab();
  return (
    <div>
      <label className="flex pr-1 items-center flex-col text-tiny!">
        Bulatkan?
        <select
          className="py-1 h-fit! outline text-tiny!"
          value={fix}
          onChange={(e) => {
            if (tab === undefined) return;
            const val = e.currentTarget.value;
            const num = Number(val);
            if (isNaN(num)) return;
            basicStore.set((prev) => ({ ...prev, fix: num }));
            queue.add(tx.transaction.update.fix(tab, num));
          }}
        >
          <option value={0}>0</option>
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
          <option value={5}>5</option>
        </select>
      </label>
    </div>
  );
}
