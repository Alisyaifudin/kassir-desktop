import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useDB } from "~/RootLayout";
import { TextError } from "~/components/TextError";
import { useAction } from "~/hooks/useAction";
import { Input } from "~/components/ui/input";
import { z } from "zod";
import { emitter } from "~/lib/event-emitter";

export function NewBtn() {
	const db = useDB();
	const [open, setOpen] = useState(false);
	const { loading, error, setError, action } = useAction(
		{ name: "", value: "", global: "" },
		({ name, value }: { name: string; value: string }) => db.social.insert(name, value)
	);
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = z
			.object({
				name: z.string().min(1, { message: "Harus ada" }),
				value: z.string().min(1, { message: "Harus ada" }),
			})
			.safeParse({
				name: formData.get("name"),
				value: formData.get("value"),
			});
		if (!parsed.success) {
			const errs = parsed.error.flatten().fieldErrors;
			setError({
				global: "",
				name: errs.name?.join("; ") ?? "",
				value: errs.value?.join("; ") ?? "",
			});
			return;
		}
		const errMsg = await action(parsed.data);
		if (errMsg === null) {
			setError(null);
			setOpen(false);
			emitter.emit("fetch-social");
		} else {
			setError({ global: errMsg, name: "", value: "" });
		}
	};
	return (
		<Dialog open={open} onOpenChange={(open) => setOpen(open)}>
			<Button asChild>
				<DialogTrigger>Tambah</DialogTrigger>
			</Button>
			<DialogContent className="max-w-4xl">
				<DialogHeader>
					<DialogTitle className="text-3xl">Tambah Kontak</DialogTitle>
					<form
						onSubmit={handleSubmit}
						className="grid grid-cols-[250px_1fr] gap-2 items-center justify-end"
					>
						<Input name="name" placeholder="Nama Kontak" />
						<Input name="value" placeholder="Isian Kontak" />
						{error ? (
							<>
								<TextError>{error.name}</TextError>
								<TextError>{error.value}</TextError>
							</>
						) : null}
						<div className="col-span-2 flex flex-col items-end">
							{error?.global ? <TextError>{error.global}</TextError> : null}
							<Button>
								Tambah
								{loading && <Loader2 className="animate-spin" />}
							</Button>
						</div>
					</form>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
}
