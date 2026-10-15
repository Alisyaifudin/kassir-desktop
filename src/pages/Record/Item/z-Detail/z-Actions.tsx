import { useUser } from "~/hooks/use-user";
import type { RecordFull } from "~/services/record";
import { DebtDialog } from "./z-Debt";
import { DeleteBtn } from "./z-DeleteBtn";
import { EditDialog } from "./z-Edit";

/** The record-level controls; debt settlement is admin-only, as on /records. */
export function Actions({ record }: { record: RecordFull }) {
  const role = useUser().role;
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <EditDialog record={record} />
        {record.isCredit && role === "admin" ? (
          <DebtDialog grandTotal={record.grandTotal} recordId={record.id} />
        ) : null}
      </div>
      <DeleteBtn recordId={record.id} />
    </div>
  );
}
