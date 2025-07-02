import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { memo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { TextError } from "~/components/TextError";
import { useDel } from "../_hooks/use-del";
import { Database } from "~/database";

export const DeleteBtn = memo(function ({
	id,
	name,
	value,
	revalidate,
	db,
}: {
	id: number;
	name: string;
	value: string;
	revalidate: () => void;
	db: Database;
}) {
	const [open, setOpen] = useState(false);
	const { loading, error, handleSubmit } = useDel(id, setOpen, revalidate, db);
	return (
		<Dialog open={open} onOpenChange={(open) => setOpen(open)}>
			<Button type="button" asChild className="rounded-full" variant="destructive">
				<DialogTrigger>
					<X size={35} />
				</DialogTrigger>
			</Button>
			<DialogContent className="max-w-4xl">
				<DialogHeader>
					<DialogTitle className="text-3xl">Hapus Kontak</DialogTitle>
					<form onSubmit={handleSubmit} className="flex flex-col gap-2 text-3xl">
						<div className="grid grid-cols-[200px_1fr]">
							<p>Nama</p>
							<p>: {name}</p>
						</div>
						<div className="grid grid-cols-[200px_1fr]">
							<p>Isian</p>
							<p>: {value}</p>
						</div>
						{error ? <TextError>{error}</TextError> : null}
						<div className="col-span-2 flex flex-col items-end">
							<Button variant="destructive">
								Hapus
								{loading && <Loader2 className="animate-spin" />}
							</Button>
						</div>
					</form>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
});
