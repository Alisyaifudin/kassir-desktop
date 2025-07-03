import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { Loader2 } from "lucide-react";
import { DeleteBtn } from "./DeleteBtn";
import { GenerateBarcode } from "./GenerateBarcodeBtn";
import { Database } from "~/database";
import { useEdit } from "../_hooks/use-edit";
import { useNavigate } from "react-router";
import { Field } from "./Field";

export function Form({ product, db }: { product: DB.Product; db: Database }) {
	const navigate = useNavigate();
	const { error, loading, handleSubmit } = useEdit(product.id, navigate, db);
	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full">
			<h1 className="font-bold text-3xl">Edit barang</h1>
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
			<Field error={error?.price ?? ""} label="Harga*:">
				<Input
					type="number"
					className="outline w-[300px]"
					name="price"
					required
					defaultValue={product.price}
					step={0.00001}
					aria-autocomplete="list"
				/>
			</Field>
			<Field error={error?.capital ?? ""} label="Modal:">
				<Input
					type="number"
					className="outline w-[300px]"
					name="capital"
					aria-autocomplete="list"
					step={0.00001}
					defaultValue={product.capital}
				/>
			</Field>
			<Field error={error?.stock ?? ""} label="Stok*:">
				<Input
					type="number"
					className="outline w-[100px]"
					name="stock"
					required
					aria-autocomplete="list"
					defaultValue={product.stock}
				/>
			</Field>
			<Field error={error?.stockBack ?? ""} label="Gudang:">
				<Input
					type="number"
					className="outline w-[100px]"
					name="stock-back"
					aria-autocomplete="list"
					defaultValue={product.stock_back}
				/>
			</Field>
			<div className="flex items-center gap-2">
				<Field error={error?.barcode ?? ""} label="Barcode:">
					<Input
						type="text"
						className="outline w-[300px]"
						name="barcode"
						aria-autocomplete="list"
						defaultValue={product.barcode ?? ""}
					/>
				</Field>
				<GenerateBarcode id={product.id} barcode={product.barcode} db={db} />
			</div>
			<label className="flex flex-col">
				<div className="grid grid-cols-[120px_1fr] gap-2 items-center">
					<span className="text-3xl">Catatan</span>
					<Textarea className="min-h-[300px]" name="note" defaultValue={product.note} />
				</div>
				{error?.note === "" ? null : (
					<div className="flex gap-2">
						<div className="w-[120px]"></div>
						<TextError>{error?.note ?? ""}</TextError>
					</div>
				)}
			</label>
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
