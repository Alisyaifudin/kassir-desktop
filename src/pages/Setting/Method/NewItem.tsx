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
import { Method } from "~/lib/utils";
import { z } from "zod";
import { emitter } from "~/lib/event-emitter";

export function NewBtn({ method }: { method: Method }) {
	const db = useDB();
	const [open, setOpen] = useState(false);
	const { loading, error, setError, action } = useAction("", (name: string) =>
		db.method.insert(name, method)
	);
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = z.string().min(1, { message: "Harus ada" }).safeParse(formData.get("name"));
		if (!parsed.success) {
			const errs = parsed.error.flatten().formErrors;
			setError(errs.join(";"));
			return;
		}
		const errMsg = await action(parsed.data);
		setError(errMsg);
		if (errMsg === null) {
			setOpen(false);
			emitter.emit("fetch-method");
		}
	};
	return (
		<Dialog open={open} onOpenChange={(open) => setOpen(open)}>
			<Button className="w-fit self-end" asChild>
				<DialogTrigger>Tambah</DialogTrigger>
			</Button>
			<DialogContent className="max-w-xl">
				<DialogHeader>
					<DialogTitle className="text-3xl">Tambahkan Jenis Pembayaran</DialogTitle>
					<form onSubmit={handleSubmit} className="flex flex-col gap-2">
						<Input name="name" placeholder="Nama" />
						{error ? <TextError>{error}</TextError> : null}
						<div className="col-span-2 flex flex-col items-end">
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
