import { X } from "lucide-react";
import { cn } from "~/lib/utils";
import { AdditionalTransfrom } from "~/pages/Shop/_utils/util-generate-record";
import { useAdditionalForm } from "~/pages/Shop/_components/LeftPanel/Additional/use-additional-form";
import { Show } from "~/components/Show";
import { useFix } from "~/pages/Shop/_hooks/use-fix";

export function AdditionalItem({
	index,
	additional: initAdd,
}: {
	index: number;
	additional: AdditionalTransfrom;
}) {
	const { handle, additional } = useAdditionalForm(index, initAdd);
	const [fix] = useFix();
	return (
		<div
			className={cn(
				"grid gap-1 text-3xl self-end items-center",
				additional.kind === "percent"
					? "grid-cols-[30px_200px_70px_110px_200px_50px]"
					: "grid-cols-[30px_275px_110px_35px_160px_50px]"
			)}
		>
			<input
				type="checkbox"
				name="saved"
				className="w-7 h-7"
				checked={additional.saved}
				onChange={handle.changeSaved}
			/>
			<input type="text" value={additional.name} onChange={handle.changeName} />
			<Show when={additional.kind === "number"}>
				<select value={additional.kind} className="w-fit" onChange={handle.changeKind}>
					<option value="number">Angka</option>
					<option value="percent">Persen</option>
				</select>
			</Show>
			<Show when={additional.kind === "number"}>
				<p>Rp</p>
			</Show>
			<input
				type="number"
				className="border py-1"
				value={additional.value}
				onChange={handle.changeValue}
			/>
			<Show when={additional.kind === "percent"}>
				<select value={additional.kind} className="w-fit border" onChange={handle.changeKind}>
					<option value="number">Angka</option>
					<option value="percent">Persen</option>
				</select>
				<p className="text-end">Rp{Number(initAdd.effVal.toFixed(fix)).toLocaleString("id-ID")}</p>
			</Show>
			<div className="py-0.5 flex items-center">
				<button onClick={handle.del} className="bg-red-500 text-white">
					<X size={35} />
				</button>
			</div>
		</div>
	);
}
