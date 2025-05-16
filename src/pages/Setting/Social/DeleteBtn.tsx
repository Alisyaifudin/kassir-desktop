import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { useDB } from "~/RootLayout";
import { TextError } from "~/components/TextError";
import { useAction } from "~/hooks/useAction";
import { emitter } from "~/lib/event-emitter";

export function DeleteBtn({ id, name, value }: { id: number; name: string; value: string }) {
	const db = useDB();
	const [open, setOpen] = useState(false);
	const { loading, error, setError, action } = useAction("", (id: number) => db.social.delete(id));
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const errMsg = await action(id);
		setError(errMsg);
		if (errMsg === null) {
			setOpen(false);
			emitter.emit("fetch-social");
		}
	};
	return (
		<Dialog open={open} onOpenChange={(open) => setOpen(open)}>
			<Button type="button" asChild className="rounded-full" variant="destructive">
				<DialogTrigger>
					<X size={35} />
				</DialogTrigger>
			</Button>
			<DialogContent className="max-w-4xl">
				<DialogHeader>
					<DialogTitle className="text-3xl">Hapus Kontak</DialogTitle>
					<form onSubmit={handleSubmit} className="flex flex-col gap-2 text-3xl">
						<div className="grid grid-cols-[200px_1fr]">
							<p>Nama</p>
							<p>: {name}</p>
						</div>
						<div className="grid grid-cols-[200px_1fr]">
							<p>Isian</p>
							<p>: {value}</p>
						</div>
						{error ? <TextError>{error}</TextError> : null}
						<div className="col-span-2 flex flex-col items-end">
							<Button variant="destructive">
								Hapus
								{loading && <Loader2 className="animate-spin" />}
							</Button>
						</div>
					</form>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
}
