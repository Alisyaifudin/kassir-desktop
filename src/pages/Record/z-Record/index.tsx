import { useMemo } from "react";
import Decimal from "decimal.js";
import { METHOD_BASE_KIND } from "~/lib/constants";
import type { Record as RecordModel } from "~/services/record";
import { List } from "./List";
import { useMode } from "../use-mode";
import { useMethod } from "../use-method";

const BASE_KIND: Record<string, string | undefined> = METHOD_BASE_KIND;

/**
 * A base filter (`1000`-`1003`) matches any payment of that kind; a custom one
 * matches the exact method. Records carry every payment applied (split payment),
 * so any match counts.
 */
function matchesMethod(record: RecordModel, methodId: string | null): boolean {
  if (methodId === null) return true;
  const kind = BASE_KIND[methodId];
  if (kind !== undefined) return record.methods.some((method) => method.kind === kind);
  return record.methods.some((method) => method.methodId === methodId);
}

export function Records({ records }: { records: RecordModel[] }) {
  const [mode] = useMode();
  const [method] = useMethod();
  const methodId = method?.id ?? null;

  // The name search already happened in SQL, so this only narrows by the two
  // controls the service doesn't know about.
  const filtered = useMemo(
    () => records.filter((record) => record.mode === mode && matchesMethod(record, methodId)),
    [records, mode, methodId],
  );
  const total = useMemo(
    () => (filtered.length === 0 ? 0 : Decimal.sum(...filtered.map((r) => r.grandTotal)).toNumber()),
    [filtered],
  );

  return (
    <div className="flex flex-col gap-1 overflow-hidden h-full">
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full overflow-hidden">
          <List records={filtered} />
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 py-2 border-t mt-auto">
        <p>Total</p>
        <p>: Rp{total.toLocaleString("id-ID")}</p>
      </div>
    </div>
  );
}
