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
import { del } from "./delete";
import { useDb } from "../../../Layout";

export function DeleteBtn({ id, name }: { id: number; name: string }) {
	const navigate = useNavigate();
	const db = useDb();
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const handleClick = () => {
		setLoading(true);
		del(db, id).then((err) => {
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
					<DialogTitle>Yakin?</DialogTitle>
					<DialogDescription>Kamu akan menghapus:</DialogDescription>
					<DialogDescription>"{name}"</DialogDescription>
					<div className="flex justify-between mt-5">
						<Button asChild>
							<DialogClose>Batal</DialogClose>
						</Button>
						<Button onClick={handleClick} variant="destructive">
							Hapus {loading && <Loader2 className="animate-spin" />}
						</Button>
					</div>
					{error === "" ? null : (
						<DialogDescription className="text-red-500">{error}</DialogDescription>
					)}
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
}
