import { ForEach } from "~/components/ForEach";
import type { ItemTransform } from "~/pages/Shop/util-generate-record";

export function Discounts({ discs }: { discs: ItemTransform["discs"] }) {
	return (
		<ForEach items={discs}>
			{(disc) => {
				let val = disc.value;
				return (
					<div className="grid grid-cols-[1fr_80px_150px_270px] gap-1 ">
						<div />
						<p>Diskon</p>
						<p className="text-end">
							{disc.kind === "percent" ? `${val}%` : val.toLocaleString("id-ID")}
						</p>
						<div />
					</div>
				);
			}}
		</ForEach>
	);
}
