import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogClose,
	DialogFooter,
} from "~/components/ui/dialog";
import { Loader2, X } from "lucide-react";
import { useDB } from "~/RootLayout";
import { TextError } from "~/components/TextError";
import { useAction } from "~/hooks/useAction";
import { image } from "~/lib/image";
import { emitter } from "~/lib/event-emitter";
import { useState } from "react";

export function DeleteImg({
	selected,
	images,
	setSelectedId,
}: {
	selected: DB.Image & { src: string };
	images: (DB.Image & { src: string })[];
	setSelectedId: (id: number) => void;
}) {
	const db = useDB();
	const [open, setOpen] = useState(false);
	const { action, loading, error, setError } = useAction("", async () => {
		const errMsgs = await Promise.all([db.image.delete(selected.id), image.del(selected.name)]);
		for (const errMsg of errMsgs) {
			if (errMsg) return errMsg;
		}
		return null;
	});
	const index = images.findIndex((img) => img.id === selected.id);
	const handleClick = async () => {
		if (index === -1) {
			return;
		}
		const errMsg = await action();
		setError(errMsg);
		if (errMsg) {
			return;
		}
		if (index + 1 < images.length) {
			setSelectedId(images[index + 1].id);
		} else if (images.length > 1) {
			setSelectedId(images[index - 1].id);
		}
		emitter.emit("fetch-images");
		setOpen(true);
	};
	return (
		<Dialog open={open} onOpenChange={(open) => setOpen(open)}>
			<Button
				asChild
				variant="destructive"
				className="rounded-full absolute top-0 right-0"
				size="icon"
			>
				<DialogTrigger>
					<X />
				</DialogTrigger>
			</Button>
			<DialogContent className="max-w-7xl">
				<DialogHeader>
					<DialogTitle className="text-3xl">Hapus Gambar</DialogTitle>
					<div className="w-full max-h-[700px] h-full flex items-center justify-center">
						<img src={selected.src} className="object-contain h-full" />
					</div>
					<div className="flex justify-between mt-5">
						<Button asChild variant="secondary">
							<DialogClose>Batal</DialogClose>
						</Button>
						<Button onClick={handleClick} variant="destructive">
							Hapus {loading ? <Loader2 className="animate-spin" /> : null}
						</Button>
					</div>
				</DialogHeader>
				{error ? (
					<DialogFooter>
						<TextError>{error}</TextError>
					</DialogFooter>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
