import { Field } from "../../Field";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { useNewAdditionalForm } from "~/pages/shop/_hooks/use-new-additional-form";
import { LocalContext } from "~/pages/shop/_hooks/use-local-state";
import { Label } from "~/components/ui/label";

export function AdditionalComponent({ context }: { context: LocalContext }) {
	const { handleSubmit, error, set, data, refs } = useNewAdditionalForm(context);
	const handleEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key !== "Enter") return;
		handleSubmit();
	};
	const handleEnterName = (e: React.KeyboardEvent<HTMLInputElement>) => {
		const input = refs.value.current;
		if (input === null || e.key !== "Enter") return;
		input.focus();
	};
	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-1 px-1">
			<Field label="Nama" error={error.name}>
				<Input
					type="text"
					name="name"
					value={data.name}
					onChange={(e) => set.name(e.currentTarget.value)}
					onKeyDown={handleEnterName}
					ref={refs.name}
					aria-autocomplete="list"
				/>
			</Field>
			<div className="flex items-start gap-2">
				<Field label="Nilai" error={error.value}>
					<Input
						type="number"
						value={data.value}
						ref={refs.value}
						onChange={(e) => set.value(e.currentTarget.value)}
						name="value"
						onKeyDown={handleEnter}
						aria-autocomplete="list"
					/>
				</Field>
				<select
					onChange={(e) => set.kind(e.currentTarget.value)}
					name="kind"
					value={data.kind}
					className="h-[54px] w-fit mt-10  outline text-3xl"
				>
					<option value="number">Angka</option>
					<option value="percent">Persen</option>
				</select>
			</div>
			<Label className="flex items-center gap-3">
				<span>Simpan?</span>
				<input
					type="checkbox"
					name="saved"
					checked={data.saved}
					onChange={(e) => set.saved(e.currentTarget.checked)}
					className="w-7 h-7"
				/>
			</Label>
			<Button type="button" onClick={handleSubmit}>
				Tambahkan
			</Button>
		</form>
	);
}
