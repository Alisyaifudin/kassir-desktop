import { Show } from "~/components/Show";
import { CalendarController } from "./CalendarController";
import { memo } from "react";
import { capitalize } from "~/lib/utils";
import { useUser } from "~/hooks/use-user";
import { Method } from "~/database/method/cache";
import { METHOD_NAMES } from "~/lib/constants";

export const Footer = memo(function Header({
  paidAt,
  cashier,
  recordId,
  mode,
  customer,
  method,
  note,
}: {
  paidAt: number;
  recordId: string;
  cashier: string;
  mode: DB.Mode;
  customer: {
    name: string;
    phone: string;
  };
  method: Method;
  note: string;
}) {
  const role = useUser().role;
  return (
    <div className="flex flex-col gap-1">
      <p>Kasir: {capitalize(cashier)}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p>No: {recordId}</p>
          <div className="border-left h-full border" />
        </div>
        <div className="flex gap-2 items-center">
          <p className="font-bold pr-5">{mode === "buy" ? "Beli" : "Jual"}</p>
          <Show when={role === "admin"}>
            <CalendarController paidAt={paidAt} recordId={recordId} />
          </Show>
        </div>
      </div>
      <Show when={customer.name !== "" && customer.phone !== ""}>
        <span>
          Pelanggan: {customer.name} ({customer.phone})
        </span>
      </Show>
      <div className="flex flex-col gap-2">
        <span>
          Metode: {METHOD_NAMES[method.kind]} {method.name}
        </span>
        <span>{note}</span>
      </div>
    </div>
  );
});
