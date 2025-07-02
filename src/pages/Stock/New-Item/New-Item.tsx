import { useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Input } from "~/components/ui/input";
import { TextError } from "~/components/TextError";
import { Textarea } from "~/components/ui/textarea";
import { Database } from "~/database";
import { useNewProduct } from "./_hooks/use-new-product";
import { Field } from "../_components/Field";

export default function Page({ db }: { db: Database }) {
	const navigate = useNavigate();
	const { loading, error, handleSubmit, ref } = useNewProduct(navigate, db);
	return (
		<main className="p-2 mx-auto w-full max-w-5xl flex flex-col gap-2">
			<Button asChild variant="link" className="self-start">
				<Button variant="link" onClick={() => navigate(-1)}>
					{" "}
					<ChevronLeft /> Kembali
				</Button>
			</Button>
			<h1 className="font-bold text-3xl">Tambah barang</h1>
			<form onSubmit={handleSubmit} className="flex flex-col gap-2">
				<Field error={error?.name} label="Nama*:">
					<Input
						ref={ref}
						type="text"
						className="outline w-full"
						name="name"
						required
						autoComplete="off"
					/>
				</Field>
				<Field error={error?.price} label="Harga*:">
					<Input
						type="number"
						className="outline w-[300px]"
						name="price"
						required
						autoComplete="off"
					/>
				</Field>
				<Field error={error?.capital} label="Modal:">
					<Input
						type="number"
						className="outline w-[300px]"
						name="capital"
						autoComplete="off"
						step={0.00001}
					/>
				</Field>
				<Field error={error?.stock} label="Stok*:">
					<Input
						type="number"
						className="outline w-[100px]"
						name="stock"
						required
						autoComplete="off"
					/>
				</Field>
				<Field error={error?.stock} label="Gudang:">
					<Input type="number" className="outline w-[100px]" name="stock-back" autoComplete="off" />
				</Field>
				<Field error={error?.barcode} label="Barcode:">
					<Input type="text" className="outline w-[300px]" name="barcode" autoComplete="off" />
				</Field>
				<label className="flex flex-col">
					<div className="grid grid-cols-[120px_1fr] gap-2 items-center">
						<span className="text-3xl">Catatan</span>
						<Textarea name="note" className="min-h-[300px]" />
					</div>
					{error?.note === "" ? null : (
						<div className="flex gap-2">
							<div className="w-[120px]"></div>
							<TextError>{error?.note ?? ""}</TextError>
						</div>
					)}
				</label>
				<Button className="w-fit text-3xl" type="submit">
					Simpan
					{loading && <Loader2 className="animate-spin" />}
				</Button>
				<TextError>{error?.global}</TextError>
			</form>
		</main>
	);
}
