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

export const NewBtn = memo(function ({ db, revalidate }: { db: Database; revalidate: () => void }) {
	const [open, setOpen] = useState(false);
	const { loading, error, handleSubmit } = useAdd(setOpen, revalidate, db);
	return (
		<Dialog open={open} onOpenChange={(open) => setOpen(open)}>
			<Button asChild>
				<DialogTrigger>Tambah</DialogTrigger>
			</Button>
			<DialogContent className="max-w-4xl">
				<DialogHeader>
					<DialogTitle className="text-3xl">Tambah Kontak</DialogTitle>
					<form
						onSubmit={handleSubmit}
						className="grid grid-cols-[250px_1fr] gap-2 items-center justify-end"
					>
						<Input name="name" placeholder="Nama Kontak" />
						<Input name="value" placeholder="Isian Kontak" />
						{error ? (
							<>
								<TextError>{error.name}</TextError>
								<TextError>{error.value}</TextError>
							</>
						) : null}
						<div className="col-span-2 flex flex-col items-end">
							<TextError>{error?.global}</TextError>
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
