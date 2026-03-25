import { ForEach } from "~/components/ForEach";
import { Show } from "~/components/Show";
import { capitalize } from "~/lib/utils";
import { formatDate, formatTime } from "~/lib/date";

export function Header({
  headers,
  owner,
  address,
  cashier,
  showCashier,
  paidAt,
  recordId,
}: {
  headers: string[];
  owner: string;
  address: string;
  cashier: string;
  showCashier: boolean;
  paidAt: number;
  recordId: string;
}) {
  return (
    <div className="flex flex-col">
      <h1 className="text-center font-bold">{owner}</h1>
      <ForEach items={headers}>{(txt) => <p className="text-center">{txt}</p>}</ForEach>
      <p>{address}</p>
      <p>No: {recordId}</p>
      <Show
        when={showCashier}
        fallback={
          <div className="flex justify-end">
            <p>
              {formatDate(paidAt, "short").replace(/-/g, "/")}, {formatTime(paidAt)}
            </p>
          </div>
        }
      >
        <div className="flex justify-between">
          <p>Kasir: {capitalize(cashier)}</p>
          <p>
            {formatDate(paidAt, "short").replace(/-/g, "/")}, {formatTime(paidAt)}
          </p>
        </div>
      </Show>
    </div>
  );
}
