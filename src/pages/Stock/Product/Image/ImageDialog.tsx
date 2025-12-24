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
import { TextError } from "~/components/TextError";
import { Input } from "~/components/ui/input";
import { useEffect, useState } from "react";
import { Show } from "~/components/Show";
import { Spinner } from "~/components/Spinner";
import { useSubmit } from "react-router";
import { Action } from "../action";
import { useAction } from "~/hooks/use-action";
import { useLoading } from "~/hooks/use-loading";

export function ImageDialog() {
	const [file, setFile] = useState<File | null>(null);
	const [img, setImg] = useState<null | string>(null);
	const [open, setOpen] = useState(false);
	const error = useAction<Action>()("add-image");
	const loading = useLoading();
	const submit = useSubmit();
	useEffect(() => {
		if (!loading && error === undefined) {
			setOpen(false);
			if (img) {
				URL.revokeObjectURL(img);
				setFile(null);
			}
		}
	}, [error, loading]);
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
		const formdata = new FormData();
		formdata.set("action", "add");
		formdata.set("image", file);
		submit(formdata, { method: "POST", encType: "multipart/form-data" });
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
			<Button asChild className="text-small!">
				<DialogTrigger>Tambah Gambar</DialogTrigger>
			</Button>
			<DialogContent className="max-w-7xl max-h-[95vh] flex">
				<div className="flex-1 flex flex-col gap-2">
					<DialogHeader>
						<DialogTitle className="text-normal">Tambahkan Gambar</DialogTitle>
					</DialogHeader>
					<Show value={img}>
						{(img) => (
							<div className="flex-1 flex items-center justify-center overflow-hidden">
								<img src={img} className="object-contain h-full" />
							</div>
						)}
					</Show>
					<Input
						type="file"
						onInput={handleInput}
						accept="image/png, image/jpeg"
						aria-autocomplete="list"
					/>
					<DialogFooter className="flex flex-col gap-1 w-full pt-5">
						<div className="flex justify-between w-full gap-2">
							<Button asChild variant="secondary">
								<DialogClose>Batal</DialogClose>
							</Button>
							<Button disabled={file === null} onClick={handleSave}>
								Tambah <Spinner when={loading} />
							</Button>
						</div>
						<TextError>{error}</TextError>
					</DialogFooter>
				</div>
			</DialogContent>
		</Dialog>
	);
}
