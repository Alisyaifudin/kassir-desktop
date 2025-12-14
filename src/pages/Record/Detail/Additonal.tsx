import { Show } from "~/components/Show";
import type { AdditionalTransfrom } from "~/lib/record";

export function Additional({ additional }: { additional: AdditionalTransfrom }) {
	return (
		<div className="grid grid-cols-[170px_200px]">
			<p className="text-end">
				{additional.name} <Show when={additional.kind === "percent"}>{additional.value}%</Show>
			</p>{" "}
			<p className="text-end">Rp{additional.effVal.toLocaleString("id-ID")}</p>
		</div>
	);
}
