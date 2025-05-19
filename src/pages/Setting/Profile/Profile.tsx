import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "~/components/ui/accordion";
import { useDB, useStore } from "~/RootLayout";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { TextError } from "~/components/TextError";
import { useUser } from "~/Layout";
import { useAction } from "~/hooks/useAction";
import { emitter } from "~/lib/event-emitter";

export default function Profile() {
	const user = useUser();
	const {name, password} = useActions()
	const handleChangeName = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = z.string().safeParse(formData.get("name"));
		if (!parsed.success) {
			name.setError(parsed.error.flatten().formErrors.join("; "));
			return;
		}
		const newName = parsed.data;
		if (newName === "") {
			name.setError("Tidak boleh kosong");
			return;
		}
		const errMsg = await name.action(parsed.data);
		if (errMsg) {
			name.setError(errMsg);
			return;
		}
		emitter.emit("fetch-user");
	};
	const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = z.string().safeParse(formData.get("password"));
		if (!parsed.success) {
			password.setError(parsed.error.flatten().formErrors.join("; "));
			return;
		}
		const newPassword = parsed.data;
		const errMsg = await password.action(newPassword);
		if (errMsg) {
			password.setError(errMsg);
			return;
		}
	};
	return (
		<div className="flex flex-col gap-2 p-5 flex-1 text-3xl justify-between">
			<form onSubmit={handleChangeName} className="flex-col gap-2 flex">
				<label className="grid grid-cols-[150px_1fr] gap-2 items-center">
					<span>Nama</span>
					<Input defaultValue={user.name} name="name" required aria-autocomplete="list" />
				</label>
				<Button className="w-fit self-end">
					Simpan {name.loading ? <Loader2 className="animate-spin" /> : null}
				</Button>
				{name.error ? <TextError>{name.error}</TextError> : null}
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
									Simpan {password.loading ? <Loader2 className="animate-spin" /> : null}
								</Button>
								{password.error ? <TextError>{password.error}</TextError> : null}
							</form>
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			) : null}
		</div>
	);
}

function useActions() {
	const db = useDB();
	const store = useStore();
	const user = useUser();
	const name = useAction("", async (name: string) => {
		const [errMsg] = await Promise.all([
			db.cashier.updateName(user.name, name),
			store.core.set("token", {
				name,
				expires: user.expires,
				role: user.role,
				token: user.token,
			}),
		]);
		return errMsg;
	});
	const password = useAction("", async (password: string) => {
		return await db.cashier.updatePassword(user.name, password);
	});
	return {name, password}
}