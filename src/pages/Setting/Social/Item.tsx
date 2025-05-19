import { Input } from "~/components/ui/input";
import { DeleteBtn } from "./DeleteBtn";
import { useDB } from "~/RootLayout";
import { useAction } from "~/hooks/useAction";
import { z } from "zod";
import { emitter } from "~/lib/event-emitter";
import { Loader2 } from "lucide-react";
import { TextError } from "~/components/TextError";

export function Item({ id, name, value }: { id: number; name: string; value: string }) {
	const db = useDB();
	const { loading, error, setError, action } = useAction(
		{ name: "", value: "", global: "" },
		({ id, name, value }: { id: number; name: string; value: string }) =>
			db.social.update(id, name, value)
	);
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = z
			.object({
				id: z.number(),
				name: z.string().min(1, { message: "Harus ada" }),
				value: z.string().min(1, { message: "Harus ada" }),
			})
			.safeParse({
				id,
				name: formData.get("name"),
				value: formData.get("value"),
			});
		if (!parsed.success) {
			const errs = parsed.error.flatten().fieldErrors;
			setError({
				global: "",
				name: errs.name?.join("; ") ?? "",
				value: errs.value?.join("; ") ?? "",
			});
			return;
		}
		const errMsg = await action(parsed.data);
		if (errMsg === null) {
			setError(null);
			emitter.emit("fetch-social");
		} else {
			setError({ global: errMsg, name: "", value: "" });
		}
	};
	return (
		<form onSubmit={handleSubmit} className="grid grid-cols-[250px_1fr_60px] gap-2 items-center">
			<Input name="name" defaultValue={name} placeholder="Nama Kontak" aria-autocomplete="list" />
			<Input name="value" defaultValue={value} placeholder="Isian Kontak" aria-autocomplete="list" />
			<button type="submit" className="hidden">
				Submit
			</button>
			{loading ? (
				<Loader2 className="animate-spin" size={35} />
			) : (
				<DeleteBtn id={id} name={name} value={value} />
			)}
			{error?.global ? <TextError className="col-span-2">{error.global}</TextError> : null}
			{error ? (
				<>
					<TextError>{error.name}</TextError>
					<TextError>{error.value}</TextError>
				</>
			) : null}
		</form>
	);
}
