import { Show } from "~/components/Show";
import { Summary } from "~/lib/record";

export function AdditionalItem({ additional }: { additional: Summary["additionals"][number] }) {
	return (
		<div className="grid grid-cols-[200px_250px]">
			<p className="text-end">
				{additional.name} <Show when={additional.kind === "percent"}>{additional.value}%</Show>
			</p>{" "}
			<p className="text-end">Rp{additional.effVal.toLocaleString("id-ID")}</p>
		</div>
	);
}
