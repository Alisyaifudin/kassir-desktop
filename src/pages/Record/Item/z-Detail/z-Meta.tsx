import { Show } from "~/components/Show";
import { capitalize } from "~/lib/utils";
import { formatDate, formatTime } from "~/lib/date";
import type { RecordFull } from "~/services/record";
import { useUser } from "~/hooks/use-user";
import { PaidAt } from "./z-PaidAt";
import { CreditAt } from "./z-CreditAt";

/**
 * The record's provenance, under the money: who rang it up, when, against whom,
 * and what was written on it. The creation time is immutable; paid and credit
 * dates can be corrected by an admin.
 */
export function Meta({ record }: { record: RecordFull }) {
  const role = useUser().role;
  return (
    <div className="flex flex-col gap-1">
      <p>Kasir: {capitalize(record.cashier)}</p>
      <p>Dibuat: {formatDate(record.createdAt, "long")} {formatTime(record.createdAt, "long")}</p>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {/* A ULID never breaks by itself; letting it wrap keeps the row from
            pushing the mode and the date picker out of view. */}
        <p className="min-w-0 break-all">No: {record.id}</p>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <p className="font-bold">{record.mode === "outcoming" ? "Beli" : "Jual"}</p>
          <Show when={role === "admin"}>
            <PaidAt record={record} />
            <CreditAt record={record} />
          </Show>
        </div>
      </div>
      <Show when={record.supplier.name.trim() !== ""}>
        <span>Pemasok: {record.supplier.name}</span>
      </Show>
      <Show when={record.customer.name !== "" && record.customer.phone !== ""}>
        <span>
          Pelanggan: {record.customer.name} ({record.customer.phone})
        </span>
      </Show>
      <Show when={record.note !== ""}>
        <span>{record.note}</span>
      </Show>
    </div>
  );
}
