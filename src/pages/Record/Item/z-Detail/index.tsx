import { Show } from "~/components/Show";
import { useUser } from "~/hooks/use-user";
import type { RecordFull } from "~/services/record";
import { Ledger } from "../../z-Detail/z-Ledger";
import { Identity } from "../../z-Detail/z-Identity";
import { CreditAt } from "./z-CreditAt";
import { PaidAt } from "./z-PaidAt";
import { Shelf } from "./z-Shelf";

/**
 * One record, in full: the ledger its two faces share, with the corrections this
 * page alone owns — the two date pickers in the identity band and the shelf that
 * holds `Edit`, the debt and the delete.
 *
 * The ledger's own shape (identity on top, one scroll, the shelf closing it) lives
 * in `Ledger`, so the pane that previews a record on `/records` cannot describe it
 * differently; what differs here is only what the two slots are filled with.
 */
export function Detail({ record }: { record: RecordFull }) {
  return (
    <Ledger
      record={record}
      identity={
        <Identity record={record}>
          <Corrections record={record} />
        </Identity>
      }
      shelf={<Shelf record={record} />}
    />
  );
}

/**
 * When the record was settled and when its credit was opened, each editable
 * where it is read. Admin-only, like every date correction — a cashier reads the
 * record, an admin fixes it.
 */
function Corrections({ record }: { record: RecordFull }) {
  const isAdmin = useUser().role === "admin";
  return (
    <Show when={isAdmin}>
      <div className="flex shrink-0 items-center gap-1">
        <PaidAt record={record} />
        <CreditAt record={record} />
      </div>
    </Show>
  );
}
