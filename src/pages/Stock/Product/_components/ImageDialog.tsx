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
import { Loader2 } from "lucide-react";
import { TextError } from "~/components/TextError";
import { useAction } from "~/hooks/useAction";
import { Input } from "~/components/ui/input";
import { useState } from "react";
import { image } from "~/lib/image";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";
import { emitter } from "~/lib/event-emitter";
import { Database } from "~/database";

export function ImageDialog({ productId, db }: { productId: number; db: Database }) {
	const [file, setFile] = useState<File | null>(null);
	const [img, setImg] = useState<null | string>(null);
	const [open, setOpen] = useState(false);
	const { action, error, loading, setError } = useAction("", async (file: File) => {
		const now = Temporal.Now.instant().epochMilliseconds;
		const rawName = file.name.replace(/\s+/g, "-");
		const name = `${now}-${rawName}`;
		const parsed = z.enum(["image/jpeg", "image/png"]).safeParse(file.type);
		if (!parsed.success) {
			return "Format gambar tidak didukung";
		}
		const mimeType = parsed.data;
		const errMsgs = await Promise.all([
			image.save(file, name),
			db.image.add.one(name, mimeType, productId),
		]);
		for (const errMsg of errMsgs) {
			if (errMsg) return errMsg;
		}
		emitter.emit("fetch-images");
		return null;
	});
	const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
		const files = e.currentTarget.files;
		if (files === null || files.length === 0) {
			setFile(null);
			setImg(null);
			return;
		}
		const file = files[0];
		setFile(file);
		setImg(URL.createObjectURL(file));
	};
	const handleSave = async () => {
		if (file === null) {
			return;
		}
		const errMsg = await action(file);
		setError(errMsg);
		if (errMsg === null) {
			setOpen(false);
			URL.revokeObjectURL(img!);
			setImg(null);
			setFile(null);
		}
	};
	return (
		<Dialog
			open={open}
			onOpenChange={(open) => {
				if (!open) {
					if (img) URL.revokeObjectURL(img);
					setImg(null);
					setFile(null);
				}
				setOpen(open);
			}}
		>
			<Button asChild>
				<DialogTrigger>Tambahkan Gambar</DialogTrigger>
			</Button>
			<DialogContent className="max-w-7xl">
				<DialogHeader>
					<DialogTitle className="text-3xl">Tambahkan Gambar</DialogTitle>
					{img ? (
						<div className="w-full max-h-[700px] h-full flex items-center justify-center">
							<img src={img} className="object-contain h-full" />
						</div>
					) : null}
					<Input
						type="file"
						onInput={handleInput}
						accept="image/png, image/jpeg"
						aria-autocomplete="list"
					/>
					<div className="flex justify-between mt-5">
						<Button asChild variant="secondary">
							<DialogClose>Batal</DialogClose>
						</Button>
						<Button disabled={file === null} onClick={handleSave}>
							Tambah {loading ? <Loader2 className="animate-spin" /> : null}
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
