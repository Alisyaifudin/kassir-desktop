import { List } from "./List";
import { Data } from "../loader";
import { useParams } from "../use-params";
import Decimal from "decimal.js";
import { METHOD_BASE_KIND } from "~/lib/utils";

export function Record({ records }: { records: Data[] }) {
  const mode = useParams().mode;
  let filtered = records.filter((r) => r.record.mode === mode);
  const methodId = useParams().methodId;
  const query = useParams().query;
  filtered = filterRecords(filtered, methodId, query);
  const total = calcTotal(filtered);
  return (
    <div className="flex flex-col gap-1 overflow-hidden">
      <div className="flex-1 max-h-full overflow-hidden">
        <div className="h-full overflow-hidden">
          <List records={filtered.map((f) => f.record)} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <p>Total</p>
        <p>: Rp{total.toLocaleString("id-ID")}</p>
      </div>
    </div>
  );
}

function calcTotal(records: Data[]): number {
  if (records.length === 0) return 0;
  const total = Decimal.sum(...records.map((r) => r.record.grandTotal));
  return total.toNumber();
}

function filterRecords(records: Data[], methodId: number | null, query: string): Data[] {
  if (methodId !== null) {
    if (methodId === 1000 || methodId === 1001 || methodId === 1002 || methodId === 1003) {
      records = records.filter((r) => r.record.method.kind === METHOD_BASE_KIND[methodId]);
    } else {
      records = records.filter((r) => r.record.method.id === methodId);
    }
  }
  let q = query.trim().toLowerCase();
  if (q !== "") {
    const f: Data[] = [];
    for (const r of records) {
      const product = r.products.find((p) => p.name.toLowerCase().includes(q));
      if (product !== undefined) {
        f.push(r);
      }
    }
    records = f;
  }
  return records;
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
