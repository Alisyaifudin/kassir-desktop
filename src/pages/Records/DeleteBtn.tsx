import { Button } from "../../components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogClose,
} from "../../components/ui/dialog";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useDb } from "../../Layout";

export function DeleteBtn({ timestamp }: { timestamp: number }) {
	const db = useDb();
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const handleClick = () => {
		setLoading(true);
		db.record.delete(timestamp).then((err) => {
			if (err) {
				setError(err);
				setLoading(false);
				return;
			}
			setLoading(false);
		});
	};
	return (
		<Dialog>
			<Button asChild variant="destructive">
				<DialogTrigger>Hapus</DialogTrigger>
			</Button>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="text-3xl">Hapus catatan riwayat?</DialogTitle>
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
