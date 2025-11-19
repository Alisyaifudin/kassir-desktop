import { Store } from "~/lib/store";
import { useSize } from "../_hooks/use-size";
import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { style } from "~/lib/style";

export function SelectSize({ context }: { size?: string; context: { store: Store } }) {
	const { size, loading, error, handleChangeSize } = useSize(context);
	return (
		<div className="flex items-center gap-2">
			<label style={style[size].text} className="font-semibold">
				Ukuran
			</label>
			<select
				value={size}
				style={style[size].text}
				className="p-1 outline"
				onChange={(e) => handleChangeSize(e.currentTarget.value)}
			>
				<option value="small">Kecil</option>
				<option value="big">Besar</option>
			</select>
			<Spinner size={style[size].icon} when={loading} />
			<TextError style={style[size].text}>{error}</TextError>
		</div>
	);
}
