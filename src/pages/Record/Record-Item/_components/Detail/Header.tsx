import { Show } from "~/components/Show";
import { CalendarController } from "./CalendarController";
import { memo } from "react";

export const Header = memo(function ({
	timestamp,
	cashier,
	mode,
	role,
	showCashier,
}: {
	showCashier: boolean;
	timestamp: number;
	cashier: string;
	mode: DB.Mode;
	role: DB.Role;
}) {
	return (
		<div className="flex items-center justify-between">
			<div className="flex items-center gap-2">
				<p>No: {timestamp}</p>
				<Show when={showCashier}>
					<div className="border-left h-full border" />
					<p>Kasir: {cashier}</p>
				</Show>
			</div>
			<Show when={role === "admin"}>
				<CalendarController mode={mode} timestamp={timestamp} />
			</Show>
		</div>
	);
});
