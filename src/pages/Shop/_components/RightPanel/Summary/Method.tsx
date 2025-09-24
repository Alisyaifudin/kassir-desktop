import { METHOD_NAMES } from "~/lib/utils";
import { useMethodHandler } from "./use-method-handler";

export function Method() {
	const { method, handleChange, option, suboption, suboptionTop, handleChangeSub } =
		useMethodHandler();
	return (
		<div className="flex items-center gap-3 text-3xl">
			<select value={method.method} onChange={handleChange} className=" w-[200px] outline">
				{option.map((m) => (
					<option key={m.id} value={m.method}>
						{METHOD_NAMES[m.method]}
					</option>
				))}
			</select>
			{suboption.length > 0 ? (
				<select value={method.id} onChange={handleChangeSub} className=" w-[200px] outline">
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
