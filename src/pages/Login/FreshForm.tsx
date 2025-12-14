import { Input } from "~/components/ui/input";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/Spinner";
import { Form, useActionData, useNavigation } from "react-router";
import { Action } from "./action";

export function FreshForm() {
	const navigation = useNavigation();
	const error = useAction();
	const loading = navigation.state == "submitting";
	return (
		<div className="flex flex-col gap-5 p-5 bg-white mx-auto w-full max-w-5xl ">
			<h1 className="text-big font-bold">Selamat Datang</h1>
			<p>Silakan buat akun terlebih 😊</p>
			<Form method="POST" className="flex text-normal flex-col gap-2">
				<input type="hidden" name="action" value="fresh"></input>
				<label className="grid items-center grid-cols-[250px_1fr]">
					<span>Nama</span>
					<Input required name="name" aria-autocomplete="list" />
				</label>
				<TextError>{error?.name}</TextError>
				<label className="grid items-center grid-cols-[250px_1fr]">
					<span>Kata Sandi</span>
					<Input name="password" type="password" aria-autocomplete="list" />
				</label>
				<TextError>{error?.password}</TextError>
				<label className="grid items-center grid-cols-[250px_1fr]">
					<span>Ulangi Kata Sandi</span>
					<Input name="confirm" type="password" aria-autocomplete="list" />
				</label>
				<TextError>{error?.confirm}</TextError>
				<Button className="w-fit self-end" disabled={loading}>
					Simpan
					<Spinner when={loading} />
				</Button>
			</Form>
		</div>
	);
}

function useAction() {
	const action = useActionData<Action>();
	if (action === undefined || action.action !== "fresh") return undefined;
	return action.error;
}
