import { useSize } from "~/hooks/use-size";
import { useUser } from "~/hooks/use-user";
import { style } from "~/lib/style";
import { capitalize } from "~/lib/utils";

const localStyle = {
	big: {
		grandTotal: {
			fontSize: "128px",
			lineHeight: 0.8,
		},
		container: {
			paddingBottom: "36px"
		}
	},
	small: {
		grandTotal: {
			fontSize: "96px",
			lineHeight: 0.8,
		},
		container: {
			paddingBottom: "25px"
		}
	},
};


export function GrandTotal({ grandTotal, fix }: { grandTotal: number; fix: number }) {
	const user = useUser();
	const size = useSize();
	return (
		<div style={localStyle[size].container} className="flex flex-col">
			<p style={style[size].text} className="px-2 text-end">
				Kasir: {capitalize(user.name)}
			</p>
			<p style={localStyle[size].grandTotal} className="text-center">
				Rp{Number(grandTotal.toFixed(fix)).toLocaleString("id-ID")}
			</p>
		</div>
	);
}
