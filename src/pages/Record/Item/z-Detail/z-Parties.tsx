import { Show } from "~/components/Show";
import type { RecordFull } from "~/services/record";

/**
 * Who the transaction was with, and what was written on it. The parties are
 * facts about the record, not about the money, so they sit at the end of the
 * ledger rather than in a panel of their own — read once, then out of the way.
 */
export function Parties({ record }: { record: RecordFull }) {
  const customer = record.customer.name.trim();
  const supplier = record.supplier.name.trim();
  const note = record.note.trim();
  if (customer === "" && supplier === "" && note === "") return null;

  return (
    <dl className="flex flex-col gap-1 px-1 text-small">
      <Show when={customer !== ""}>
        <div className="flex gap-2">
          <dt className="w-[110px] shrink-0 text-muted-foreground">Pelanggan</dt>
          <dd className="min-w-0 break-words">
            {customer}
            {record.customer.phone.trim() === "" ? null : (
              <span className="text-muted-foreground"> ({record.customer.phone})</span>
            )}
          </dd>
        </div>
      </Show>
      <Show when={supplier !== ""}>
        <div className="flex gap-2">
          <dt className="w-[110px] shrink-0 text-muted-foreground">Pemasok</dt>
          <dd className="min-w-0 break-words">{supplier}</dd>
        </div>
      </Show>
      <Show when={note !== ""}>
        <div className="flex gap-2">
          <dt className="w-[110px] shrink-0 text-muted-foreground">Catatan</dt>
          <dd className="min-w-0 whitespace-pre-line break-words">{note}</dd>
        </div>
      </Show>
    </dl>
  );
}
