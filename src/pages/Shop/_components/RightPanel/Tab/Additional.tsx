import { Field } from "../../Field";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { useNewAdditionalForm } from "~/pages/shop/_hooks/use-new-additional-form";
import { LocalContext } from "~/pages/shop/_hooks/use-local-state";

export function AdditionalComponent({ context }: { context: LocalContext }) {
	const { handleSubmit, error } = useNewAdditionalForm(context);
	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-1 px-1">
			<Field label="Nama" error={error.name}>
				<Input type="text" name="name" aria-autocomplete="list" />
			</Field>
			<div className="flex items-end gap-2">
				<Field label="Nilai" error={error.value}>
					<Input type="number" name="value" aria-autocomplete="list" />
				</Field>
				<select name="kind" defaultValue="percent" className="h-[54px] w-fit  outline text-3xl">
					<option value="number">Angka</option>
					<option value="percent">Persen</option>
				</select>
			</div>
			<Button>Tambahkan</Button>
		</form>
	);
}
