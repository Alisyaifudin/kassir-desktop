import { useState } from "react";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { TextError } from "~/components/TextError";
import { z } from "zod";
import { Input } from "~/components/ui/input";
import { useDB } from "~/RootLayout";
import { useAction } from "~/hooks/useAction";
import { emitter } from "~/lib/event-emitter";

export function NewCashier() {
	const db = useDB();
	const [open, setOpen] = useState(false);
	const { action, loading, error, setError } = useAction("", (name: string) =>
		db.cashier.add(name, "user")
	);
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = z.string().safeParse(formData.get("name"));
		if (!parsed.success) {
			setError(parsed.error.flatten().formErrors.join("; "));
			return;
		}
		const name = parsed.data;
		const errMsg = await action(name);
		setError(errMsg);
		if (errMsg === null) {
			setOpen(false);
			emitter.emit("fetch-cashiers");
		}
	};
	return (
		<Dialog open={open} onOpenChange={(open) => setOpen(open)}>
			<Button asChild>
				<DialogTrigger>
					Tambah Kasir <Plus />
				</DialogTrigger>
			</Button>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="text-3xl">Tambah Kasir</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<label className="grid grid-cols-[100px_1fr] items-center">
						<span className="text-3xl">Nama:</span>
						<Input type="text" name="name" />
					</label>
					<div className="flex justify-between mt-5">
						<Button asChild variant={"secondary"}>
							<DialogClose type="button">Batal</DialogClose>
						</Button>
						<Button>Tambahkan {loading && <Loader2 className="animate-spin" />}</Button>
					</div>
				</form>
				{error ? <TextError>{error}</TextError> : null}
			</DialogContent>
		</Dialog>
	);
}
