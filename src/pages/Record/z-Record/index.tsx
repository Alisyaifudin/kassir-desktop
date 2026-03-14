import { List } from "./List";
import { DataRecord } from "../use-records";
import Decimal from "decimal.js";
import { METHOD_BASE_KIND } from "~/lib/constants";
import { useMode } from "../use-mode";
import { useMethod } from "../use-method";
import { useQuery } from "../use-query";
import { useMemo } from "react";

export function Record({ records }: { records: DataRecord[] }) {
  const [mode] = useMode();
  const [query] = useQuery();
  const [method] = useMethod();
  const methodId = method?.id ?? null;
  const filtered = useMemo(() => {
    let filtered = records.filter((r) => r.record.mode === mode);
    filtered = filterRecords(filtered, methodId, query);
    return filtered;
  }, [mode, records, query, methodId]);
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

function calcTotal(records: DataRecord[]): number {
  if (records.length === 0) return 0;
  const total = Decimal.sum(...records.map((r) => r.record.grandTotal));
  return total.toNumber();
}

function filterRecords(
  records: DataRecord[],
  methodId: number | null,
  query: string,
): DataRecord[] {
  if (methodId !== null) {
    if (methodId === 1000 || methodId === 1001 || methodId === 1002 || methodId === 1003) {
      records = records.filter((r) => r.record.method.kind === METHOD_BASE_KIND[methodId]);
    } else {
      records = records.filter((r) => r.record.method.id === methodId);
    }
  }
  const q = query.trim().toLowerCase();
  if (q !== "") {
    const f: DataRecord[] = [];
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
