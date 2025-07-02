import { METHOD_NAMES } from "~/lib/utils";
import { useMethodHandler } from "../../../_hooks/use-method-handler";
import { LocalContext } from "~/pages/shop/_hooks/use-local-state";

export function Method({ context }: { context: LocalContext }) {
	const { method, handleChange, option, suboption, suboptionTop } = useMethodHandler(context);
	return (
		<div className="flex items-center gap-3 text-3xl">
			<select value={method.id} onChange={handleChange} className=" w-[200px] outline">
				{option.map((m) => (
					<option key={m.id} value={m.id}>
						{METHOD_NAMES[m.method]}
					</option>
				))}
			</select>
			{suboption.length > 0 ? (
				<select value={method.id} onChange={handleChange} className=" w-[200px] outline">
					<option value={suboptionTop.id}>--Pilih--</option>
					{suboption.map((m) => (
						<option key={m.id} value={m.id}>
							{m.name}
						</option>
					))}
				</select>
			) : (
				<div className="w-[200px]" />
			)}
		</div>
	);
}
