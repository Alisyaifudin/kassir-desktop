import { Show } from "~/components/Show";
import { CalendarController } from "./CalendarController";
import { memo } from "react";
import { capitalize } from "~/lib/utils";
import { auth } from "~/lib/auth";

export const Header = memo(function Header({
  paidAt,
  cashier,
  timestamp,
  mode,
}: {
  paidAt: number;
  timestamp: number;
  cashier: string;
  mode: DB.Mode;
}) {
  const role = auth.user().role;
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <p>No: {timestamp}</p>
        <div className="border-left h-full border" />
        <p>Kasir: {capitalize(cashier)}</p>
      </div>
      <div className="flex gap-2 items-center">
        <p className="font-bold pr-5">{mode === "buy" ? "Beli" : "Jual"}</p>
        <Show when={role === "admin"}>
          <CalendarController paidAt={paidAt} timestamp={timestamp} />
        </Show>
      </div>
    </div>
  );
});
