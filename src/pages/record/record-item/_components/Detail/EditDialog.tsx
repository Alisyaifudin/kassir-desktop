import { memo, useCallback, useState } from "react";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { SelectMethod } from "./SelectMethod";
import { Database } from "~/database";
import { SelectMode } from "./SelectMode";
import { Note } from "./Note";
import { ToCreditBtn } from "./ToCreditBtn";
import { Show } from "~/components/Show";

export const EditDialog = memo(function ({
	timestamp,
	method,
	methods,
	revalidate,
	context,
	mode,
	note,
	credit,
}: {
	mode: DB.Mode;
	note: string;
	credit: 0 | 1;
	timestamp: number;
	method: DB.Method;
	methods: DB.Method[];
	revalidate: () => void;
	context: { db: Database };
}) {
	const [open, setOpen] = useState(false);
	const close = useCallback(() => {
		setOpen(false);
		revalidate();
	}, []);
	return (
		<Dialog open={open} onOpenChange={(open) => setOpen(open)}>
			<Button variant="outline" asChild className="text-3xl w-fit">
				<DialogTrigger>
					<span>Edit</span>
				</DialogTrigger>
			</Button>
			<DialogContent className="text-3xl">
				<DialogHeader>
					<DialogTitle className="text-5xl">Sunting catatan</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col gap-3 py-5">
					<Show when={credit === 0}>
						<SelectMode close={close} context={context} mode={mode} timestamp={timestamp} />
					</Show>
					<SelectMethod
						revalidate={revalidate}
						timestamp={timestamp}
						method={method}
						methods={methods}
						close={close}
						context={context}
					/>
					<Note close={close} context={context} note={note} timestamp={timestamp} />
					<ToCreditBtn
						credit={credit}
						timestamp={timestamp}
						close={close}
						context={context}
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
});
