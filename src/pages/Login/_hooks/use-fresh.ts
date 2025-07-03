import { NavigateFunction } from "react-router";
import { z } from "zod";
import { Database } from "~/database";
import { useAction } from "~/hooks/useAction";
import { auth } from "~/lib/auth";
import { Store } from "~/lib/store";
import { log } from "~/lib/utils";

const newAccountSchema = z.object({
	name: z.string().min(1, { message: "Minimal satu karakter" }),
	password: z.string(),
	confirm: z.string(),
});

export function useFresh(
	navigate: NavigateFunction,
	revalidate: () => void,
	context: { db: Database; store: Store }
) {
	const { db, store } = context;
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
			const errAuth = await db.cashier.add.one(name, "admin", hash);
			if (errAuth) {
				log.error("Gagal menyimpan di database");
				return { name: "", password: "", confirm: "Gagal menyimpan di database" };
			}
			const errStore = await auth.store(store, { name, role: "admin" });
			if (errStore) {
				return { name: "", password: "", confirm: errStore };
			}
			revalidate();
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
		if (error !== null) {
			setError(error);
			return;
		}
		navigate("/setting");
	};
	return { loading, error, handleSubmit };
}
