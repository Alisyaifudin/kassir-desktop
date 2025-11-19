import { X } from "lucide-react";
import { cn } from "~/lib/utils";
import { AdditionalTransfrom } from "~/pages/Shop/util-generate-record";
import { useAdditionalForm } from "~/pages/Shop/LeftPanel/Additional/use-additional-form";
import { Show } from "~/components/Show";
import { useFix } from "~/pages/Shop/use-fix";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

const localStyle = {
	big: {
		percent: {
			gridTemplateColumns: "30px 200px 70px 110px 200px 50px",
		},
		number: {
			gridTemplateColumns: "30px 275px 110px 35px 160px 50px",
		},
	},
	small: {
		percent: {
			gridTemplateColumns: "30px 100px 70px 110px 100px 50px",
		},
		number: {
			gridTemplateColumns: "30px 100px 90px 35px 120px 50px",
		},
	},
};

export function AdditionalItem({
	index,
	additional: initAdd,
}: {
	index: number;
	additional: AdditionalTransfrom;
}) {
	const { handle, additional } = useAdditionalForm(index, initAdd);
	const size = useSize();
	const [fix] = useFix();
	return (
		<div
			style={localStyle[size][additional.kind]}
			className={cn(
				"grid gap-1 py-0.5 self-end items-center"
			)}
		>
			<input
				style={style[size].checkbox}
				type="checkbox"
				name="saved"
				checked={additional.saved}
				onChange={handle.changeSaved}
			/>
			<input
				style={style[size].text}
				type="text"
				className="pl-1"
				value={additional.name}
				onChange={handle.changeName}
			/>
			<Show when={additional.kind === "number"}>
				<select
					style={style[size].text}
					value={additional.kind}
					className="w-fit"
					onChange={handle.changeKind}
				>
					<option value="number">Angka</option>
					<option value="percent">Persen</option>
				</select>
			</Show>
			<Show when={additional.kind === "number"}>
				<p style={style[size].text}>Rp</p>
			</Show>
			<input
				style={style[size].text}
				type="number"
				className="border py-1 pl-1"
				value={additional.value}
				onChange={handle.changeValue}
			/>
			<Show when={additional.kind === "percent"}>
				<select
					style={style[size].text}
					value={additional.kind}
					className="w-fit border"
					onChange={handle.changeKind}
				>
					<option value="number">Angka</option>
					<option value="percent">Persen</option>
				</select>
				<p style={style[size].text} className="text-end">
					Rp{Number(initAdd.effVal.toFixed(fix)).toLocaleString("id-ID")}
				</p>
			</Show>
			<div className="py-0.5 flex items-center">
				<button onClick={handle.del} className="bg-red-500 text-white">
					<X size={style[size].icon} />
				</button>
			</div>
		</div>
	);
}
