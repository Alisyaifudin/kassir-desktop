import { Loader2 } from "lucide-react";
import { z } from "zod";
import { TextError } from "~/components/TextError";
import { useAction } from "~/hooks/useAction";
import { emitter } from "~/lib/event-emitter";
import { useDB } from "~/RootLayout";

export function SelectMode({
	record,
	items,
	setIsEdit,
}: {
	record: DB.Record;
	items: DB.RecordItem[];
	setIsEdit: (edit: boolean) => void;
}) {
	const db = useDB();
	const { action, error, loading, setError } = useAction("", (mode: "buy" | "sell") =>
		db.record.updateMode(record, items, mode)
	);
	const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
		const mode = z.enum(["buy", "sell"]).catch("buy").parse(e.currentTarget.value);
		const errMsg = await action(mode);
		setError(errMsg);
		if (errMsg === null) {
			emitter.emit("fetch-record-item");
			setIsEdit(false);
		}
	};
	return (
		<label className="grid grid-cols-[120px_1fr] items-center gap-2">
			<span>Mode</span>
			<div className="flex gap-2">
				{loading ? <Loader2 className="animate-spin" /> : <p>:</p>}
				<select value={record.mode} className=" w-fit outline" onChange={handleChange}>
					<option value="sell">Jual</option>
					<option value="buy">Beli</option>
				</select>
				{error === null || error === "" ? null : <TextError>{error ?? ""}</TextError>}
			</div>
		</label>
	);
}
