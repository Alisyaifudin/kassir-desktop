import { Input } from "~/components/ui/input";
import { DeleteBtn } from "./DeleteBtn";
import { Loader2 } from "lucide-react";
import { TextError } from "~/components/TextError";
import { useEdit } from "../_hooks/use-edit";
import { Either } from "~/components/Either";
import { memo } from "react";
import { Database } from "~/database";

export const Item = memo(function ({
	id,
	name,
	value,
	revalidate,
	db,
}: {
	id: number;
	name: string;
	value: string;
	revalidate: () => void;
	db: Database;
}) {
	const { loading, handleSubmit, error } = useEdit(id, revalidate, db);
	return (
		<form onSubmit={handleSubmit} className="grid grid-cols-[250px_1fr_60px] gap-2 items-center">
			<Input name="name" defaultValue={name} placeholder="Nama Kontak" aria-autocomplete="list" />
			<Input
				name="value"
				defaultValue={value}
				placeholder="Isian Kontak"
				aria-autocomplete="list"
			/>
			<button type="submit" className="hidden">
				Submit
			</button>
			<Either
				if={loading}
				then={<Loader2 className="animate-spin" size={35} />}
				else={<DeleteBtn id={id} name={name} value={value} revalidate={revalidate} db={db} />}
			/>
			<TextError className="col-span-2">{error?.global}</TextError>
			<TextError>{error?.name}</TextError>
			<TextError>{error?.value}</TextError>
		</form>
	);
});
