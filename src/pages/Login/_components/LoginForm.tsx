import { Password } from "~/components/Password";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { CashierWithoutPassword } from "~/database/cashier";
import { useLogin } from "../_hooks/use-login";
import { Spinner } from "~/components/Spinner";
import { Show } from "~/components/Show";
import { Database } from "~/database";
import { Store } from "~/lib/store";
import { useNavigate } from "react-router";

export function LoginForm({
	cashiers,
	context,
}: {
	cashiers: CashierWithoutPassword[];
	context: { db: Database; store: Store };
}) {
	const navigate = useNavigate();
	const { handleSelect, handleSubmit, loading, error, selected } = useLogin(
		cashiers,
		navigate,
		context
	);
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
				<Show when={selected?.role === "admin"}>
					<label className="grid items-center grid-cols-[150px_1fr]">
						<span>Kata Sandi</span>
						<Password name="password" />
					</label>
				</Show>
				<TextError>{error}</TextError>
				<Button className="w-fit self-end" disabled={loading || selected === null}>
					Masuk
					<Spinner when={loading} />
				</Button>
			</form>
		</div>
	);
}
