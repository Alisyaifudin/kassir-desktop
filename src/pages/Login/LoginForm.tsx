import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { z } from "zod";
import { Password } from "~/components/Password";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { CashierWithoutPassword } from "~/database/cashier";
import { useAction } from "~/hooks/useAction";
import { auth } from "~/lib/auth";
import { useDB, useStore } from "~/RootLayout";

export function LoginForm({ cashiers }: { cashiers: CashierWithoutPassword[] }) {
	const navigate = useNavigate();
	const [selected, setSelected] = useState<{ name: string; role: "admin" | "user" } | null>(null);
	const db = useDB();
	const store = useStore();
	const { action, setError, error, loading } = useAction(
		"",
		async (vars: { password: string; name: string }) => {
			const [errHash, hash] = await db.cashier.getHash(vars.name);
			if (errHash) {
				return errHash;
			}
			const errPass = await auth.verify(vars.password, hash);
			if (errPass) {
				return errPass;
			}
			return null;
		}
	);
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		if (!localStorage || selected === null) {
			return;
		}
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
    setError(null);
		if (selected.role === "admin") {
			const parsed = z.string().safeParse(formData.get("password"));
			if (!parsed.success) {
				const errs = parsed.error.flatten().formErrors;
				setError(errs.join("; ") ?? "");
				return;
			}
			const password = parsed.data;
			const errMsg = await action({ password, name: selected.name });
			if (errMsg !== null) {
				setError(errMsg);
				return;
			}
		}
		const errStore = await auth.store(store, selected.name, selected.role);
		if (errStore) {
			setError(errStore);
			return;
		}
		navigate("/setting");
	};
	const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const user = cashiers.find((c) => c.name === e.currentTarget.value);
		if (!user) {
			setSelected(null);
			return;
		}
		setSelected(user);
	};
	return (
		<div className="flex flex-col gap-5 p-5 bg-white mx-auto w-full max-w-5xl ">
			<h1 className="text-5xl font-bold">Masuk</h1>
			<form onSubmit={handleSubmit} className="flex flex-col gap-2 text-3xl">
				<label className="grid items-center grid-cols-[150px_1fr]">
					<span>Nama</span>
					<select
						value={selected?.name ?? ""}
						onChange={handleSelect}
						className="outline rounded-lg p-2"
					>
						<option value="">--PILIH AKUN--</option>
						{cashiers.map((c) => (
							<option key={c.name} value={c.name}>
								{c.name}
							</option>
						))}
					</select>
				</label>
				{selected && selected.role === "admin" ? (
					<label className="grid items-center grid-cols-[150px_1fr]">
						<span>Kata Sandi</span>
						<Password name="password" />
					</label>
				) : null}
				{error ? <TextError>{error}</TextError> : null}
				<Button className="w-fit self-end" disabled={loading || selected === null}>
					Masuk {loading ? <Loader2 className="animate-spin" /> : null}
				</Button>
			</form>
		</div>
	);
}
