import { useNavigate } from "react-router";
import { Button } from "../../../components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogClose,
} from "../../../components/ui/dialog";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useDB } from "../../../RootLayout";
import { TextError } from "../../../components/TextError";

export function DeleteBtn({ id, name }: { id: number; name: string }) {
	const navigate = useNavigate();
	const db = useDB();
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const handleClick = () => {
		setLoading(true);
		db.product.delete(id).then((err) => {
			if (err) {
				setError(err);
				setLoading(false);
				return;
			}
			setLoading(false);
			navigate(-1);
		});
	};
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
							Hapus {loading && <Loader2 className="animate-spin" />}
						</Button>
					</div>
					{error === "" ? null : <TextError>{error}</TextError>}
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
}
