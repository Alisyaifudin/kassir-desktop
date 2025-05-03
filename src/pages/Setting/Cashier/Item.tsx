import { useState } from "react";
import { Input } from "../../../components/ui/input";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Loader2, X } from "lucide-react";
import { TextError } from "../../../components/TextError";
import { useDb } from "../../../Layout";
import { tryResult } from "../../../lib/utils";
import { z } from "zod";

export function Item({ cashier, sendSignal }: { cashier: DB.Cashier; sendSignal: () => void }) {
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const db = useDb();
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = z.object({ name: z.string() }).safeParse({ name: formData.get("name") });
		if (!parsed.success) {
			setError(parsed.error.flatten().fieldErrors.name?.join("; ") ?? "Ada yang salah");
			return;
		}
		const { name } = parsed.data;
		setLoading(true);
		const [errMsg] = await tryResult({
			run: () => db.cashier.update(cashier.name, name),
		});
		if (errMsg !== null) {
			setError(errMsg);
			setLoading(false);
			return;
		}
		sendSignal();
		setError("");
		setLoading(false);
	};
	return (
		<form onSubmit={handleSubmit} className="flex items-center gap-1">
			<Input type="text" defaultValue={cashier.name} name="name" />
			{loading ? <Loader2 className="animate-spin" /> : null}
			{error === "" ? null : <TextError>{error}</TextError>}
			<DeleteBtn name={cashier.name} sendSignal={sendSignal} />
		</form>
	);
}

export function DeleteBtn({ name, sendSignal }: { name: string; sendSignal: () => void }) {
	const db = useDb();
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const handleClick = () => {
		setLoading(true);
		db.cashier.delete(name).then((err) => {
			if (err) {
				setError(err);
				setLoading(false);
				return;
			}
			sendSignal();
			setLoading(false);
		});
	};
	return (
		<Dialog>
			<Button type="button" asChild variant="destructive">
				<DialogTrigger>
					<X />
				</DialogTrigger>
			</Button>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="text-3xl">Yakin?</DialogTitle>
					<DialogDescription className="text-2xl">Kamu akan menghapus:</DialogDescription>
					<DialogDescription className="text-2xl">
						{">"}
						{name}
					</DialogDescription>
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
