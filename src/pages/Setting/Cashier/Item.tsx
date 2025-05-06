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
import { useDb } from "../../../RootLayout";
import { tryResult } from "../../../lib/utils";
import { z } from "zod";
import { CashierWithoutPassword } from "../../../database/cashier";

export function Item({
	cashier,
	sendSignal,
	username,
}: {
	cashier: CashierWithoutPassword;
	sendSignal: () => void;
	username: string;
}) {
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
			run: () => db.cashier.updateName(cashier.name, name),
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
	const handleChangeRole = async (e: React.ChangeEvent<HTMLSelectElement>) => {
		const parsed = z.enum(["admin", "user"]).safeParse(e.currentTarget.value);
		if (!parsed.success) {
			setError(parsed.error.flatten().formErrors.join("; "));
			return;
		}
		const role = parsed.data;
		const errMsg = await db.cashier.updateRole(cashier.name, role);
		if (errMsg) {
			setError(errMsg);
			return;
		}
		sendSignal();
	};
	if (username === cashier.name) {
		return (
			<div className="flex items-center justify-between pr-22">
				<p className="text-2xl pl-3">{username}</p>
				<p className="text-3xl">{title[cashier.role]}</p>
			</div>
		);
	}
	return (
		<form onSubmit={handleSubmit} className="flex items-center gap-3">
			<Input type="text" defaultValue={cashier.name} name="name" />
			{loading ? <Loader2 className="animate-spin" /> : null}
			{error === "" ? null : <TextError>{error}</TextError>}
			<select value={cashier.role} onChange={handleChangeRole} className="text-3xl">
				<option value="admin">Admin</option>
				<option value="user">User</option>
			</select>
			<DeleteBtn name={cashier.name} sendSignal={sendSignal} />
		</form>
	);
}

const title = {
	admin: "Admin",
	user: "User"
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
