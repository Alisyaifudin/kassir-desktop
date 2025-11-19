import { useSize } from "~/hooks/use-size";
import { useUser } from "~/hooks/use-user";
import { style } from "~/lib/style";
import { capitalize } from "~/lib/utils";

const gt = {
	big: {
		fontSize: "128px",
	},
	small: {
		fontSize: "96px",
	},
};

export function GrandTotal({ grandTotal, fix }: { grandTotal: number; fix: number }) {
	const user = useUser();
	const size = useSize();
	return (
		<div className="flex flex-col gap-2">
			<p style={style[size].text} className="px-2 text-end">
				Kasir: {capitalize(user.name)}
			</p>
			<p style={gt[size]} className="text-center">
				Rp{Number(grandTotal.toFixed(fix)).toLocaleString("id-ID")}
			</p>
		</div>
	);
}
