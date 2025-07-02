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
import { useNewCashier } from "../_hooks/use-new-cashier";
import { Spinner } from "~/components/Spinner";
import { Database } from "~/database";

export const NewCashier = memo(function ({
	revalidate,
	db,
}: {
	revalidate: () => void;
	db: Database;
}) {
	const [open, setOpen] = useState(false);
	const { handleSubmit, loading, error } = useNewCashier(setOpen, revalidate, db);
	return (
		<Dialog open={open} onOpenChange={(open) => setOpen(open)}>
			<Button asChild>
				<DialogTrigger>
					Tambah Kasir <Plus />
				</DialogTrigger>
			</Button>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="text-3xl">Tambah Kasir</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<label className="grid grid-cols-[100px_1fr] items-center">
						<span className="text-3xl">Nama:</span>
						<Input type="text" name="name" />
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
