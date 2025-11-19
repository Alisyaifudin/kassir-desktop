import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { NotepadText } from "lucide-react";
import { Textarea } from "~/components/ui/textarea";
import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { useNote } from "./use-note";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

export function Note() {
	const [note, setNote] = useNote();
	const [val, setVal] = useState(note);
	const size = useSize();
	const debounced = useDebouncedCallback((value: string) => setNote(value), DEBOUNCE_DELAY);
	const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setVal(e.currentTarget.value);
		debounced(e.currentTarget.value);
	};
	return (
		<Dialog>
			<Button className="p-1 rounded-full" asChild variant="secondary">
				<DialogTrigger type="button">
					<NotepadText size={style[size].icon} />
				</DialogTrigger>
			</Button>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="text-3xl">Catatan</DialogTitle>
				</DialogHeader>
				<Textarea value={val} onChange={handleChange} className="min-h-[400px]" />
			</DialogContent>
		</Dialog>
	);
}
