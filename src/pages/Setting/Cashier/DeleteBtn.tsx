import { Loader2, X } from "lucide-react";
import { useState } from "react";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { useAction } from "~/hooks/useAction";
import { emitter } from "~/lib/event-emitter";
import { useDB } from "~/RootLayout";

export function DeleteBtn({ name }: { name: string }) {
	const db = useDB();
	const [open, setOpen] = useState(false);
	const { action, loading, error, setError } = useAction("", (name: string) => {
		return db.cashier.delete(name);
	});
	const handleClick = async () => {
		const errMsg = await action(name);
		setError(errMsg);
		if (errMsg === null) {
			emitter.emit("fetch-cashiers");
			setOpen(false);
		}
	};
	return (
		<Dialog open={open} onOpenChange={(open) => setOpen(open)}>
			<Button type="button" asChild variant="destructive">
				<DialogTrigger>
					<X />
				</DialogTrigger>
			</Button>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="text-3xl">Yakin?</DialogTitle>
					<DialogDescription className="text-2xl">Kamu akan menghapus:</DialogDescription>
					<DialogDescription className="text-2xl">
						{">"}
						{name}
					</DialogDescription>
					<div className="flex justify-between mt-5">
						<Button asChild>
							<DialogClose>Batal</DialogClose>
						</Button>
						<Button onClick={handleClick} variant="destructive">
							Hapus {loading && <Loader2 className="animate-spin" />}
						</Button>
					</div>
					{error ? <TextError>{error}</TextError> : null}
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
}
