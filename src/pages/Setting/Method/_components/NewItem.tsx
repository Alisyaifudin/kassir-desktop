import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { memo, useState } from "react";
import { TextError } from "~/components/TextError";
import { Input } from "~/components/ui/input";
import { useAdd } from "../_hooks/use-add";
import { Spinner } from "~/components/Spinner";
import { Database } from "~/database";

export const NewBtn = memo(function ({
	method,
	db,
	revalidate,
}: {
	method: DB.MethodEnum;
	db: Database;
	revalidate: () => void;
}) {
	const [open, setOpen] = useState(false);
	const { error, handleSubmit, loading } = useAdd(method, setOpen, revalidate, db);
	return (
		<Dialog open={open} onOpenChange={(open) => setOpen(open)}>
			<Button className="w-fit self-end" asChild>
				<DialogTrigger>Tambah</DialogTrigger>
			</Button>
			<DialogContent className="max-w-xl">
				<DialogHeader>
					<DialogTitle className="text-3xl">Tambahkan Jenis Pembayaran</DialogTitle>
					<form onSubmit={handleSubmit} className="flex flex-col gap-2">
						<Input name="name" placeholder="Nama" aria-autocomplete="list" />
						<TextError>{error}</TextError>
						<div className="col-span-2 flex flex-col items-end">
							<Button>
								Tambah
								<Spinner when={loading} />
							</Button>
						</div>
					</form>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
});
