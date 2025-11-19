import { METHOD_NAMES } from "~/lib/utils";
import { useMethodHandler } from "./use-method-handler";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

const selectWidth = {
	big: {
		width: "200px",
	},
	small: {
		width: "130px",
	},
};

export function Method() {
	const { method, handleChange, option, suboption, suboptionTop, handleChangeSub } =
		useMethodHandler();
	const size = useSize();
	return (
		<div className="flex items-center gap-3">
			<select
				style={{ ...style[size].text, ...selectWidth[size] }}
				value={method.method}
				onChange={handleChange}
				className="outline"
			>
				{option.map((m) => (
					<option key={m.id} value={m.method}>
						{METHOD_NAMES[m.method]}
					</option>
				))}
			</select>
			{suboption.length > 0 ? (
				<select
					style={{ ...style[size].text, ...selectWidth[size] }}
					value={method.id}
					onChange={handleChangeSub}
					className="outline"
				>
					<option value={suboptionTop.id}>--Pilih--</option>
					{suboption.map((m) => (
						<option key={m.id} value={m.id}>
							{m.name}
						</option>
					))}
				</select>
			) : (
				<div style={selectWidth[size]} />
			)}
		</div>
	);
}
