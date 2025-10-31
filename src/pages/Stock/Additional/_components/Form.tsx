import { Input } from "~/components/ui/input";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { Loader2 } from "lucide-react";
import { DeleteBtn } from "./DeleteBtn";
import { Database } from "~/database";
import { useEdit } from "../_hooks/use-edit";
import { useNavigate } from "react-router";
import { Field } from "./Field";
import { Label } from "~/components/ui/label";

export function Form({ product, db }: { product: DB.AdditionalItem; db: Database }) {
	const navigate = useNavigate();
	const { error, loading, handleSubmit } = useEdit(product.id, navigate, db);
	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full">
			<h1 className="font-bold text-3xl">Edit biaya lainnya</h1>
			<Field error={error?.name ?? ""} label="Nama*:">
				<Input
					type="text"
					className="outline"
					name="name"
					required
					defaultValue={product.name}
					aria-autocomplete="list"
				/>
			</Field>
			<Field error={error?.value ?? ""} label="Nilai*:">
				<Input
					type="number"
					className="outline w-[300px]"
					name="value"
					required
					defaultValue={product.value}
					step={0.00001}
					aria-autocomplete="list"
				/>
			</Field>
			<div className="grid grid-cols-[120px_1fr] gap-2 items-center">
				<Label className="text-3xl">Jenis:</Label>
				<select
					name="kind"
					defaultValue={product.kind}
					className="h-[54px] w-fit outline text-3xl"
				>
					<option value="number">Angka</option>
					<option value="percent">Persen</option>
				</select>
			</div>
			<div className="flex items-center justify-between">
				<Button className="w-fit" type="submit">
					Simpan
					{loading && <Loader2 className="animate-spin" />}
				</Button>
				<DeleteBtn id={product.id} name={product.name} db={db} />
			</div>
			{error?.global === "" ? null : <TextError>{error?.global ?? ""}</TextError>}
		</form>
	);
}
