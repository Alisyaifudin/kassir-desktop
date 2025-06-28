import { X } from "lucide-react";
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
import { useDeleteCashier } from "../_hooks/use-delete-cashier";
import { Spinner } from "~/components/Spinner";

export function DeleteBtn({ name }: { name: string }) {
	const [open, setOpen] = useState(false);
	const { loading, error, handleClick } = useDeleteCashier(name, setOpen);
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
							Hapus
							<Spinner when={loading} />
						</Button>
					</div>
					<TextError>{error}</TextError>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
}
