import { ForEach } from "~/components/ForEach";
import type { ItemTransform } from "../../_utils/generate-record";

export function Discounts({
	discs,
	fix,
}: {
	discs: ItemTransform["discs"];
	fix: number;
}) {
	return (
		<ForEach items={discs}>
			{(disc) => {
				let val = Number(disc.value.toFixed(fix));
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
