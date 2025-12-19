import { Show } from "~/components/Show";
import { CalendarController } from "./CalendarController";
import { memo } from "react";
import { capitalize } from "~/lib/utils";
import { Size } from "~/lib/store-old";
import { auth } from "~/lib/auth";

export const Header = memo(function ({
  timestamp,
  cashier,
  mode,
}: {
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
      <Show when={role === "admin"}>
        <CalendarController mode={mode} timestamp={timestamp} />
      </Show>
    </div>
  );
});
