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
import { useDeleteCustomer } from "../_hooks/use-delete-cusomer";
import { Spinner } from "~/components/Spinner";
import { Database } from "~/database";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

export const DeleteBtn = memo(function ({
	name,
	phone,
	revalidate,
	db,
}: {
	name: string;
	phone: string;
	revalidate: () => void;
	db: Database;
}) {
	const [open, setOpen] = useState(false);
	const { loading, error, handleClick } = useDeleteCustomer(phone, setOpen, revalidate, db);
	const size = useSize();
	return (
		<Dialog open={open} onOpenChange={(open) => setOpen(open)}>
			<Button className="p-2 rounded-full" type="button" asChild variant="destructive">
				<DialogTrigger>
					<X size={style[size].icon} />
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
					<DialogDescription className="text-2xl">
						{">"}
						{phone}
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
