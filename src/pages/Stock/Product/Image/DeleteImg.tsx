import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogClose,
	DialogFooter,
} from "~/components/ui/dialog";
import { X } from "lucide-react";
import { TextError } from "~/components/TextError";
import { useEffect, useState } from "react";
import { Spinner } from "~/components/Spinner";
import { useLoading } from "~/hooks/use-loading";
import { Form } from "react-router";
import { Action } from "../action";
import { useAction } from "~/hooks/use-action";
import { ImageResult } from "./loader";

export function DeleteImg({ selected }: { selected: ImageResult }) {
	const [open, setOpen] = useState(false);
	const loading = useLoading();
	const error = useAction<Action>()("delete-image");
	useEffect(() => {
		if (!loading && error === undefined) {
			setOpen(false);
		}
	}, [loading, error]);
	return (
		<Dialog open={open} onOpenChange={(open) => setOpen(open)}>
			<Button asChild variant="destructive" className="rounded-full absolute top-1 right-0 p-1">
				<DialogTrigger>
					<X className="icon" />
				</DialogTrigger>
			</Button>
			<DialogContent className="max-w-7xl max-h-[95vh] flex">
				<div className="flex flex-1 flex-col">
					<DialogHeader>
						<DialogTitle className="text-normal">Hapus Gambar</DialogTitle>
					</DialogHeader>
					<div className="flex flex-1 items-center justify-center overflow-hidden">
						<img src={selected.href} className="object-contain h-full" />
					</div>
					<div className="flex justify-between mt-5">
						<Button asChild variant="secondary">
							<DialogClose>Batal</DialogClose>
						</Button>
						<Form method="POST">
							<input type="hidden" name="action" value="delete"></input>
							<input type="hidden" name="image-id" value={selected.id}></input>
							<Button variant="destructive">
								Hapus <Spinner when={loading} />
							</Button>
						</Form>
					</div>
					{error ? (
						<DialogFooter>
							<TextError>{error}</TextError>
						</DialogFooter>
					) : null}
				</div>
			</DialogContent>
		</Dialog>
	);
}
