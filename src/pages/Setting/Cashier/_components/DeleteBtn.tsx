import { X } from "lucide-react";
import { memo, useState } from "react";
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
import { Database } from "~/database";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

export const DeleteBtn = memo(function ({
	name,
	revalidate,
	db,
}: {
	name: string;
	revalidate: () => void;
	db: Database;
}) {
	const size = useSize();
	const [open, setOpen] = useState(false);
	const { loading, error, handleClick } = useDeleteCashier(name, setOpen, revalidate, db);
	return (
		<Dialog open={open} onOpenChange={(open) => setOpen(open)}>
			<Button className="rounded-full p-2" type="button" asChild variant="destructive">
				<DialogTrigger>
					<X />
				</DialogTrigger>
			</Button>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="text-3xl">Yakin?</DialogTitle>
					<DialogDescription style={style[size].text}>Kamu akan menghapus:</DialogDescription>
					<DialogDescription style={style[size].text}>
						{">"}
						{name}
					</DialogDescription>
					<div className="flex justify-between mt-5">
						<Button style={style[size].text} asChild>
							<DialogClose>Batal</DialogClose>
						</Button>
						<Button style={style[size].text} onClick={handleClick} variant="destructive">
							Hapus
							<Spinner when={loading} />
						</Button>
					</div>
					<TextError>{error}</TextError>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
});
