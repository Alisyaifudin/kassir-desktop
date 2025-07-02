import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Database } from "~/database";
import { useNote } from "../../_hooks/use-note";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { memo } from "react";

export const Note = memo(function ({
	note,
	timestamp,
	close,
	context,
}: {
	timestamp: number;
	note: string;
	close: () => void;
	context: { db: Database };
}) {
	const { handleSubmit, loading, error } = useNote(timestamp, close, context);
	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4">
			<label className="flex flex-col gap-1">
				<div className="flex items-center gap-1">
					<p>Catatan:</p>
					<Spinner when={loading} />
				</div>
				<Textarea defaultValue={note} name="note" className="min-h-[300px]" />
				<TextError>{error}</TextError>
			</label>
			<Button className="self-end">Simpan Catatan</Button>
		</form>
	);
});
