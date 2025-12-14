import { List } from "./List";
import type { RecordTransform } from "~/lib/record";
import { useSearchParams } from "react-router";
import { getParam } from "../utils/params";
import { Size } from "~/lib/store-old";

export function Record({
  records,
  size,
  total,
}: {
  records: RecordTransform[];
  total: number;
  size: Size;
}) {
  const [search] = useSearchParams();
  // const [order, setOrder] = useState<"time" | "total">("time");
  const mode = getParam(search).mode;
  // if (order === "total") {
  // 	records.sort((a, b) => b.grandTotal - a.grandTotal);
  // } else {
  // 	records.sort((a, b) => b.timestamp - a.timestamp);
  // }
  return (
    <div className="flex flex-col gap-1 overflow-hidden">
      <List records={records.filter((r) => r.mode === mode)} size={size} />
      <div className="flex items-center gap-2">
        <p>Total</p>
        <p>: Rp{total.toLocaleString("id-ID")}</p>
      </div>
    </div>
  );
}

{
  /* <div className="flex items-center gap-1">
				<Label>Urutkan</Label>
				<select
					value={order}
					onChange={(e) => {
						setOrder(e.currentTarget.value as any);
					}}
					className="text-2xl p-1 border border-border rounded-md"
				>
					<option value="time">Waktu</option>
					<option value="total">Total</option>
				</select>
			</div> */
}
