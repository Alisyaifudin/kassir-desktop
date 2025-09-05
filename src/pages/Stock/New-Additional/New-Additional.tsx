import { useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Input } from "~/components/ui/input";
import { TextError } from "~/components/TextError";
import { Database } from "~/database";
import { useNewAdditional } from "./_hooks/use-new-additional";
import { Field } from "../_components/Field";
import { Label } from "~/components/ui/label";

export default function Page({ db }: { db: Database }) {
	const navigate = useNavigate();
	const { loading, error, handleSubmit, ref } = useNewAdditional(navigate, db);
	return (
		<main className="p-2 mx-auto w-full max-w-5xl flex flex-col gap-2">
			<Button asChild variant="link" className="self-start">
				<Button variant="link" onClick={() => navigate(-1)}>
					{" "}
					<ChevronLeft /> Kembali
				</Button>
			</Button>
			<h1 className="font-bold text-3xl">Tambah biaya lainnya</h1>
			<form onSubmit={handleSubmit} className="flex flex-col gap-2">
				<Field error={error?.name} label="Nama*:">
					<Input
						ref={ref}
						type="text"
						className="outline w-full"
						name="name"
						required
						aria-autocomplete="list"
					/>
				</Field>
				<Field error={error?.value} label="Nilai*:">
					<Input
						type="number"
						className="outline w-[300px]"
						name="value"
						required
						aria-autocomplete="list"
					/>
				</Field>
				<div className="grid grid-cols-[120px_1fr] gap-2 items-center">
					<Label className="text-3xl">Jenis:</Label>
					<select name="kind" defaultValue="percent" className="h-[54px] w-fit outline text-3xl">
						<option value="number">Angka</option>
						<option value="percent">Persen</option>
					</select>
				</div>
				<Button className="w-fit text-3xl" type="submit">
					Simpan
					{loading && <Loader2 className="animate-spin" />}
				</Button>
				<TextError>{error?.global}</TextError>
			</form>
		</main>
	);
}
