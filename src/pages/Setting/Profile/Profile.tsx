import { useState } from "react";
import { Auth } from "../../../components/Auth";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { User } from "../../../lib/auth";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "../../../components/ui/accordion";
import { useDb, useStore } from "../../../RootLayout";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { TextError } from "../../../components/TextError";

export default function Page() {
	return <Auth>{(user, update) => <Profile user={user} update={update} />}</Auth>;
}

function Profile({ user, update }: { user: User; update: () => void }) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const db = useDb();
	const store = useStore();
	const handleChangeName = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLoading(true);
		const formData = new FormData(e.currentTarget);
		const parsed = z.string().safeParse(formData.get("name"));
		if (!parsed.success) {
			setLoading(false);
			setError(parsed.error.flatten().formErrors.join("; "));
			return;
		}
		const newName = parsed.data;
		if (newName === "") {
			setError("Tidak boleh kosong");
			setLoading(false);
			return;
		}
		const [errMsg] = await Promise.all([
			db.cashier.updateName(user.name, newName),
			store.core.set("token", {
				name: newName,
				expires: user.expires,
				role: user.role,
				token: user.token,
			}),
		]);
		if (errMsg) {
			setLoading(false);
			setError(errMsg);
			return;
		}
		setLoading(false);
		update();
	};
	const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formEl = e.currentTarget;
		setLoading(true);
		const formData = new FormData(e.currentTarget);
		const parsed = z.string().safeParse(formData.get("password"));
		if (!parsed.success) {
			setLoading(false);
			setError(parsed.error.flatten().formErrors.join("; "));
			return;
		}
		const password = parsed.data;
		const errMsg = await db.cashier.updatePassword(user.name, password);
		if (errMsg) {
			setLoading(false);
			setError(errMsg);
			return;
		}
		setLoading(false);
		formEl.reset();
	};
	return (
		<div className="flex flex-col gap-2 p-5 flex-1 text-3xl justify-between">
			<form onSubmit={handleChangeName} className="flex-col gap-2 flex">
				<label className="grid grid-cols-[150px_1fr] gap-2 items-center">
					<span>Nama</span>
					<Input defaultValue={user.name} name="name" required />
				</label>
				<Button className="w-fit self-end">
					Simpan {loading ? <Loader2 className="animate-spin" /> : null}
				</Button>
				{error ? <TextError>{error}</TextError> : null}
			</form>
			{user.role === "admin" ? (
				<Accordion type="single" collapsible className="bg-red-400 text-white">
					<AccordionItem value="item-1">
						<AccordionTrigger className="font-bold text-3xl px-2">
							Ganti kata sandi
						</AccordionTrigger>
						<AccordionContent>
							<form onSubmit={handleChangePassword} className="flex-col gap-2 flex px-2 text-3xl">
								<label className="grid grid-cols-[250px_1fr] gap-2 items-center">
									<span>Kata Sandi Baru</span>
									<Input type="password" name="password" />
								</label>
								<Button className="w-fit self-end">
									Simpan {loading ? <Loader2 className="animate-spin" /> : null}
								</Button>
							</form>
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			) : null}
		</div>
	);
}
