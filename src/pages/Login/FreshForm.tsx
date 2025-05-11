import { useNavigate } from "react-router";
import { z } from "zod";
import { useAction } from "~/hooks/useAction";
import { useDB, useStore } from "~/RootLayout";
import { auth } from "~/lib/auth";
import { log } from "~/lib/utils";
import { Input } from "~/components/ui/input";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { Loader2 } from "lucide-react";

const newAccountSchema = z.object({
	name: z.string().min(1, { message: "Minimal satu karakter" }),
	password: z.string(),
	confirm: z.string(),
});

export function FreshForm() {
	const navigate = useNavigate();
	const store = useStore();
	const db = useDB();
	const { action, loading, error, setError } = useAction(
		{ name: "", password: "", confirm: "" },
		async (data: { name: string; password: string; confirm: string }) => {
			const { name, password, confirm } = data;
			if (password !== confirm) {
				return { confirm: "Kata sandi tidak sesuai", password: "", name: "" };
			}
			const [errMsg, hash] = await auth.hash(password);
			if (errMsg) {
				return { name: "", password: "", confirm: errMsg };
			}
			const errAuth = await db.cashier.add(name, "admin", hash);
			if (errAuth) {
				log.error("Gagal menyimpan di database");
				return { name: "", password: "", confirm: "Gagal menyimpan di database" };
			}
			const errStore = await auth.store(store, name, "admin");
			if (errStore) {
				return { name: "", password: "", confirm: errStore };
			}
			return null;
		}
	);
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		if (!localStorage) {
			return;
		}
		e.preventDefault();
		setError(null);
		const formData = new FormData(e.currentTarget);
		const parsed = newAccountSchema.safeParse({
			name: formData.get("name"),
			password: formData.get("password"),
			confirm: formData.get("confirmed-password"),
		});
		if (!parsed.success) {
			const errs = parsed.error.flatten().fieldErrors;
			setError({
				name: errs.name?.join("; ") ?? "",
				password: errs.password?.join("; ") ?? "",
				confirm: errs.confirm?.join("; ") ?? "",
			});
			return;
		}
		const error = await action(parsed.data);
		if (error) {
			setError(error);
			return;
		}
		navigate("/setting");
	};
	return (
		<div className="flex flex-col gap-5 p-5 bg-white mx-auto w-full max-w-5xl ">
			<h1 className="text-5xl font-bold">Selamat Datang</h1>
			<p className="text-3xl">Silakan buat akun terlebih 😊</p>
			<form onSubmit={handleSubmit} className="flex flex-col gap-2 text-3xl">
				<label className="grid items-center grid-cols-[250px_1fr]">
					<span>Nama</span>
					<Input required name="name" />
				</label>
				{error?.name ? <TextError>{error.name}</TextError> : null}
				<label className="grid items-center grid-cols-[250px_1fr]">
					<span>Kata Sandi</span>
					<Input name="password" type="password" />
				</label>
				{error?.password ? <TextError>{error.password}</TextError> : null}
				<label className="grid items-center grid-cols-[250px_1fr]">
					<span>Ulangi Kata Sandi</span>
					<Input name="confirmed-password" type="password" />
				</label>
				{error?.confirm ? <TextError>{error.confirm}</TextError> : null}
				<Button className="w-fit self-end" disabled={loading}>
					Simpan {loading ? <Loader2 className="animate-spin" /> : null}
				</Button>
			</form>
		</div>
	);
}

