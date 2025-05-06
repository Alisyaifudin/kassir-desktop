import { Button } from "../../components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogClose,
} from "../../components/ui/dialog";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useDb } from "../../RootLayout";
import { TextError } from "../../components/TextError";

export function DeleteBtn({ timestamp, sendSignal }: { timestamp: number, sendSignal: ()=> void }) {
	const db = useDb();
	const [error, setError] = useState("");
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const handleClick = () => {
		setLoading(true);
		db.record.delete(timestamp).then((err) => {
			if (err) {
				setError(err);
				setLoading(false);
				return;
			}
			sendSignal();
			setLoading(false);
			setOpen(false);
		});
	};
	return (
		<Dialog open={open} onOpenChange={(open) => setOpen(open)}>
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
					{error === "" ? null : <TextError>{error}</TextError>}
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
}