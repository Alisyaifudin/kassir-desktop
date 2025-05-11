import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogClose,
} from "~/components/ui/dialog";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useDB } from "~/RootLayout";
import { TextError } from "~/components/TextError";
import { useAction } from "~/hooks/useAction";

export function DeleteBtn({
	timestamp,
	revalidate,
}: {
	timestamp: number;
	revalidate: () => void;
}) {
	const db = useDB();
	const [open, setOpen] = useState(false);
	const { loading, error, setError, action } = useAction("", (timestamp: number) =>
		db.record.delete(timestamp)
	);
	const handleClick = async () => {
		const errMsg = await action(timestamp);
		setError(errMsg);
		if (errMsg === null) {
			revalidate();
			setOpen(false);
		}
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
					{error ? <TextError>{error}</TextError> : null}
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
}
