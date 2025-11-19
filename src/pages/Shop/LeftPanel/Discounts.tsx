import { ForEach } from "~/components/ForEach";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";
import type { ItemTransform } from "~/pages/Shop/util-generate-record";

const grid = {
	big: {
		gridTemplateColumns: "1fr 80px 150px 270px",
	},
	small: {
		gridTemplateColumns: "1fr 80px 130px 185px",
	},
};

export function Discounts({ discs }: { discs: ItemTransform["discs"] }) {
	const size = useSize();
	return (
		<ForEach items={discs}>
			{(disc) => {
				let val = disc.value;
				return (
					<div style={grid[size]} className="grid gap-1 ">
						<div />
						<p style={style[size].text}>Diskon</p>
						<p style={style[size].text} className="text-end">
							{disc.kind === "percent" ? `${val}%` : val.toLocaleString("id-ID")}
						</p>
						<div />
					</div>
				);
			}}
		</ForEach>
	);
}
