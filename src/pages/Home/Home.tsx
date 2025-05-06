import { useEffect, useState } from "react";
import DatabaseTauri from "@tauri-apps/plugin-sql";
import { useAsync } from "../../hooks/useAsync";
import { Await } from "../../components/Await";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { auth } from "../../lib/auth";
import { z } from "zod";
import { Database, generateDB } from "../../database";
import { CashierWithoutPassword } from "../../database/cashier";
import { useNavigate } from "react-router";
import { log } from "../../lib/utils";
import { useStore } from "../../RootLayout";
import { Loader2 } from "lucide-react";
import { TextError } from "../../components/TextError";
import { Password } from "../../components/Password";

export default function Page() {
	const state = useAsync(DatabaseTauri.load("sqlite:data.db"), []);
	return (
		<main className="flex flex-1 flex-col justify-center bg-zinc-950">
			<Await state={state}>{(db) => <Wrapper db={db} />}</Await>
		</main>
	);
}

function Wrapper({ db: dbTauri }: { db: DatabaseTauri }) {
	const [db, setDb] = useState<Database | null>(null);
	const [error, setError] = useState("");
	const [cashiers, setCashiers] = useState<CashierWithoutPassword[] | null>(null);
	useEffect(() => {
		const db = generateDB(dbTauri);
		setDb(db);
		db.cashier.get().then((data) => {
			const [errMsg, cashiers] = data;
			if (errMsg) {
				setError(errMsg);
				return;
			}
			setCashiers(cashiers);
		});
	}, []);
	if (cashiers === null || db === null) {
		return null;
	}
	if (error) {
		return (
			<main className="flex justify-center items-center">
				<TextError>{error}</TextError>
			</main>
		);
	}
	if (cashiers.length === 0) {
		return <FreshForm db={db} />;
	}
	return <Form cashiers={cashiers} db={db}></Form>;
}

function Form({ cashiers, db }: { cashiers: CashierWithoutPassword[]; db: Database }) {
	const navigate = useNavigate();
	const [selected, setSelected] = useState<{ name: string; role: "admin" | "user" } | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const store = useStore();
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		if (!localStorage || selected === null) {
			return;
		}
		e.preventDefault();
		setLoading(true);
		const formData = new FormData(e.currentTarget);
		if (selected.role === "admin") {
			const parsed = z.string().safeParse(formData.get("password"));
			if (!parsed.success) {
				const errs = parsed.error.flatten().formErrors;
				setError(errs.join("; ") ?? "");
				setLoading(false);
				return;
			}
			setError("");
			const password = parsed.data;
			const [errHash, hash] = await db.cashier.getHash(selected.name);
			if (errHash) {
				setError(errHash);
				setLoading(false);
				return;
			}
			const errPass = await auth.verify(password, hash);
			if (errPass) {
				setError(errPass);
				setLoading(false);
				return;
			}
		}
		const errStore = await auth.store(store, selected.name, selected.role);
		if (errStore) {
			setError(errStore);
			setLoading(false);
			return;
		}
		setLoading(false);
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

const newAccountSchema = z.object({
	name: z.string().min(1, { message: "Minimal satu karakter" }),
	password: z.string(),
	confirm: z.string(),
});

function FreshForm({ db }: { db: Database }) {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState({ name: "", password: "", confirm: "" });
	const store = useStore();
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		if (!localStorage) {
			return;
		}
		e.preventDefault();
		setLoading(true);
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
			setLoading(false);
			return;
		}
		setError({ name: "", password: "", confirm: "" });
		const { name, password, confirm } = parsed.data;
		if (password !== confirm) {
			setError({ confirm: "Kata sandi tidak sesuai", password: "", name: "" });
			setLoading(false);
			return;
		}
		const [errMsg, hash] = await auth.hash(password);
		if (errMsg) {
			setError({ name: "", password: "", confirm: errMsg });
			setLoading(false);
			return;
		}
		const errAuth = await db.cashier.add(name, "admin", hash);
		if (errAuth) {
			log.error("Gagal menyimpan di database");
			setError({ name: "", password: "", confirm: "Gagal menyimpan di database" });
			setLoading(false);
			return;
		}
		const errStore = await auth.store(store, name, "admin");
		if (errStore) {
			setError({ name: "", password: "", confirm: errStore });
			setLoading(false);
			return;
		}
		setLoading(false);
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
				{error.name ? <TextError>{error.name}</TextError> : null}
				<label className="grid items-center grid-cols-[250px_1fr]">
					<span>Kata Sandi</span>
					<Input name="password" type="password" />
				</label>
				{error.password ? <TextError>{error.password}</TextError> : null}
				<label className="grid items-center grid-cols-[250px_1fr]">
					<span>Ulangi Kata Sandi</span>
					<Input name="confirmed-password" type="password" />
				</label>
				{error.confirm ? <TextError>{error.confirm}</TextError> : null}
				<Button className="w-fit self-end" disabled={loading}>
					Simpan {loading ? <Loader2 className="animate-spin" /> : null}
				</Button>
			</form>
		</div>
	);
}
