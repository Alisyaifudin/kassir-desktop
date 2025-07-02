import { Input } from "~/components/ui/input";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { useFresh } from "../_hooks/use-fresh";
import { Spinner } from "~/components/Spinner";
import { useNavigate } from "react-router";
import { Database } from "~/database";
import { Store } from "~/lib/store";

export function FreshForm({context}: {context: {db: Database, store: Store}}) {
	const navigate = useNavigate();
	const { handleSubmit, error, loading } = useFresh(navigate, context);
	return (
		<div className="flex flex-col gap-5 p-5 bg-white mx-auto w-full max-w-5xl ">
			<h1 className="text-5xl font-bold">Selamat Datang</h1>
			<p className="text-3xl">Silakan buat akun terlebih 😊</p>
			<form onSubmit={handleSubmit} className="flex flex-col gap-2 text-3xl">
				<label className="grid items-center grid-cols-[250px_1fr]">
					<span>Nama</span>
					<Input required name="name" />
				</label>
				<TextError>{error?.name}</TextError>
				<label className="grid items-center grid-cols-[250px_1fr]">
					<span>Kata Sandi</span>
					<Input name="password" type="password" />
				</label>
				<TextError>{error?.password}</TextError>
				<label className="grid items-center grid-cols-[250px_1fr]">
					<span>Ulangi Kata Sandi</span>
					<Input name="confirmed-password" type="password" />
				</label>
				<TextError>{error?.confirm}</TextError>
				<Button className="w-fit self-end" disabled={loading}>
					Simpan
					<Spinner when={loading} />
				</Button>
			</form>
		</div>
	);
}
