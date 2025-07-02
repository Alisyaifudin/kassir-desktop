import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { memo, useState } from "react";
import { X } from "lucide-react";
import { TextError } from "~/components/TextError";
import { DialogDescription } from "@radix-ui/react-dialog";
import { useDel } from "../_hooks/use-del";
import { Spinner } from "~/components/Spinner";
import { Database } from "~/database";

export const DeleteBtn = memo(function ({
	method,
	db,
	revalidate,
}: {
	method: DB.Method;
	revalidate: () => void;
	db: Database;
}) {
	const [open, setOpen] = useState(false);
	const { error, loading, handleSubmit } = useDel(method, setOpen, revalidate, db);
	return (
		<Dialog open={open} onOpenChange={(open) => setOpen(open)}>
			<Button type="button" asChild className="rounded-full" variant="destructive">
				<DialogTrigger>
					<X size={30} />
				</DialogTrigger>
			</Button>
			<DialogContent className="max-w-4xl">
				<DialogHeader>
					<DialogTitle className="text-3xl">Hapus Catatan</DialogTitle>
					<form onSubmit={handleSubmit} className="flex flex-col gap-2 text-3xl">
						<DialogDescription>Hapus metode: {method.name}?</DialogDescription>
						<TextError>{error}</TextError>
						<div className="col-span-2 flex flex-col items-end">
							<Button variant="destructive">
								Hapus
								<Spinner when={loading} />
							</Button>
						</div>
					</form>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
});
