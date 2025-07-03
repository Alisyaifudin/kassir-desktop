import { Loader2 } from "lucide-react";
import { TextError } from "~/components/TextError";
import { Database } from "~/database";
import { useSelectMode } from "../../_hooks/use-select-mode";
import { memo } from "react";

export const SelectMode = memo(function ({
	timestamp,
	close,
	mode,
	context,
}: {
	timestamp: number;
	mode: DB.Mode;
	close: () => void;
	context: { db: Database };
}) {
	const { loading, error, handleChange } = useSelectMode(timestamp, close, context);
	return (
		<label className="grid grid-cols-[120px_1fr] items-center gap-2">
			<span>Mode</span>
			<div className="flex gap-2">
				{loading ? <Loader2 className="animate-spin" /> : <p>:</p>}
				<select value={mode} className=" w-fit outline" onChange={handleChange}>
					<option value="sell">Jual</option>
					<option value="buy">Beli</option>
				</select>
				<TextError>{error}</TextError>
			</div>
		</label>
	);
});
