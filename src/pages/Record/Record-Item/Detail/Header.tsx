import { Show } from "~/components/Show";
import { CalendarController } from "./CalendarController";
import { memo } from "react";
import { capitalize } from "~/lib/utils";
import { Size } from "~/lib/store-old";

export const Header = memo(function ({
  timestamp,
  cashier,
  mode,
  role,
  showCashier,
  size,
}: {
  showCashier: boolean;
  timestamp: number;
  cashier: string;
  mode: DB.Mode;
  role: DB.Role;
  size: Size;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <p>No: {timestamp}</p>
        <Show when={showCashier}>
          <div className="border-left h-full border" />
          <p>Kasir: {capitalize(cashier)}</p>
        </Show>
      </div>
      <Show when={role === "admin"}>
        <CalendarController size={size} mode={mode} timestamp={timestamp} />
      </Show>
    </div>
  );
});
