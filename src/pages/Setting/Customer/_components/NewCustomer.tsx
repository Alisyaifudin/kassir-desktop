import { memo, useState } from "react";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";
import { TextError } from "~/components/TextError";
import { Input } from "~/components/ui/input";
import { useNewCustomer } from "../_hooks/use-new-customer";
import { Spinner } from "~/components/Spinner";
import { Database } from "~/database";

export const NewCustomer = memo(function ({
	revalidate,
	db,
}: {
	revalidate: () => void;
	db: Database;
}) {
	const [open, setOpen] = useState(false);
	const { handleSubmit, loading, error } = useNewCustomer(setOpen, revalidate, db);
	return (
		<Dialog open={open} onOpenChange={(open) => setOpen(open)}>
			<Button asChild>
				<DialogTrigger>
					Tambah Pelanggan <Plus />
				</DialogTrigger>
			</Button>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="text-3xl">Tambah Pelanggan</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="flex flex-col gap-2">
					<label className="grid grid-cols-[100px_1fr] items-center">
						<span className="text-3xl">Nama:</span>
						<Input type="text" name="name" aria-autocomplete="list" />
					</label>
					<label className="grid grid-cols-[100px_1fr] items-center">
						<span className="text-3xl">Hp:</span>
						<Input type="number" name="phone" aria-autocomplete="list" />
					</label>
					<div className="flex justify-between mt-5">
						<Button asChild variant={"secondary"}>
							<DialogClose type="button">Batal</DialogClose>
						</Button>
						<Button>
							Tambahkan <Spinner when={loading} />
						</Button>
					</div>
				</form>
				<TextError>{error}</TextError>
			</DialogContent>
		</Dialog>
	);
});
