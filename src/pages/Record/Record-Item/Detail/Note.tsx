import { Textarea } from "~/components/ui/textarea";
import { TextError } from "~/components/TextError";
import { memo, useEffect } from "react";
import { Form } from "react-router";
import { useLoading } from "~/hooks/use-loading";
import { useAction } from "~/hooks/use-action";
import { Action } from "../action";

export const Note = memo(function ({ note, close }: { note: string; close: () => void }) {
	const loading = useLoading();
	const error = useAction<Action>()("edit-note");
	useEffect(() => {
		if (error !== undefined && !loading) {
			close();
		}
	}, [error, loading]);
	return (
		<Form id="record-note" method="POST" className="flex flex-col gap-4">
			<input type="hidden" name="action" value="edit-note"></input>
			<label className="flex flex-col gap-1">
				<div className="flex items-center gap-1">
					<p>Catatan:</p>
				</div>
				<Textarea defaultValue={note} name="note" rows={3} />
				<TextError>{error}</TextError>
			</label>
		</Form>
	);
});
