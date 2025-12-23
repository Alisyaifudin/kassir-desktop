import { ForEach } from "~/components/ForEach";
import { Show } from "~/components/Show";
import { capitalize, formatDate, formatTime } from "~/lib/utils";

export function Header({
	headers,
	owner,
	address,
	cashier,
	showCashier,
	timestamp,
}: {
	headers: string[];
	owner: string;
	address: string;
	cashier: string;
	showCashier: boolean;
	timestamp: number;
}) {
	return (
		<div className="flex flex-col">
			<h1 className="text-center font-bold">{owner}</h1>
			<ForEach items={headers}>{(txt) => <p className="text-center">{txt}</p>}</ForEach>
			<p>{address}</p>
			<Show when={showCashier}>
				<p>Kasir: {capitalize(cashier)}</p>
			</Show>
			<div className="flex items-center justify-between">
				<p>No: {timestamp}</p>
				<p>
					{formatDate(timestamp, "short").replace(/-/g, "/")}, {formatTime(timestamp)}
				</p>
			</div>
		</div>
	);
}
