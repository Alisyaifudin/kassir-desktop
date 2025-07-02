import { useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogClose,
} from "~/components/ui/dialog";
import { TextError } from "~/components/TextError";
import { Database } from "~/database";
import { useDelete } from "../_hooks/use-delete";
import { Spinner } from "~/components/Spinner";

export function DeleteBtn({ id, name, db }: { id: number; name: string; db: Database }) {
	const navigate = useNavigate();
	const { loading, error, handleClick } = useDelete(id, navigate, db);
	return (
		<Dialog>
			<Button asChild variant="destructive">
				<DialogTrigger>Hapus</DialogTrigger>
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
