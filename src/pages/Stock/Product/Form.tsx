import { z } from "zod";
import { numeric, Result } from "~/lib/utils";
import { useDB } from "~/RootLayout";
import { Field } from "../Field";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { DeleteBtn } from "./DeleteBtn";
import { useAction } from "~/hooks/useAction";
import { AsyncState } from "~/hooks/useAsync";
import { Await } from "~/components/Await";
import { emitter } from "~/lib/event-emitter";
const dataSchema = z.object({
	name: z.string().min(1),
	price: numeric,
	stock: numeric,
	capital: z
		.string()
		.refine((v) => !Number.isNaN(v))
		.transform((v) => (v === "" ? 0 : Number(v))),
	barcode: z.string().transform((v) => (v === "" ? null : v)),
	note: z.string(),
	id: z.number(),
});

const emptyErrs = {
	name: "",
	price: "",
	stock: "",
	barcode: "",
	global: "",
	capital: "",
	note: "",
};

export function Form({
	product,
	handleBack,
	images,
}: {
	product: DB.Product;
	handleBack: () => void;
	images: AsyncState<Result<"Aplikasi bermasalah", DB.Image[]>>;
}) {
	const db = useDB();
	const { action, error, loading, setError } = useAction(
		emptyErrs,
		(data: z.infer<typeof dataSchema>) => db.product.update(data)
	);
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = dataSchema.safeParse({
			name: formData.get("name"),
			price: formData.get("price"),
			stock: formData.get("stock"),
			barcode: formData.get("barcode"),
			capital: formData.get("capital"),
			note: formData.get("note"),
			id: product.id,
		});
		if (!parsed.success) {
			const errs = parsed.error.flatten().fieldErrors;
			setError({
				name: errs.name?.join("; ") ?? "",
				price: errs.price?.join("; ") ?? "",
				stock: errs.stock?.join("; ") ?? "",
				barcode: errs.barcode?.join("; ") ?? "",
				capital: errs.capital?.join("; ") ?? "",
				note: errs.note?.join("; ") ?? "",
				global: "",
			});
			return;
		}
		const errMsg = await action(parsed.data);
		if (errMsg) {
			setError({ ...emptyErrs, global: errMsg });
			return;
		}
		handleBack();
	};
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
					autoComplete="off"
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
					autoComplete="off"
				/>
			</Field>
			<Field error={error?.capital ?? ""} label="Modal:">
				<Input
					type="number"
					className="outline w-[300px]"
					name="capital"
					autoComplete="off"
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
					defaultValue={product.stock}
				/>
			</Field>
			<div className="flex items-center gap-2">
				<Field error={error?.barcode ?? ""} label="Barcode:">
					<Input
						type="text"
						className="outline w-[300px]"
						name="barcode"
						defaultValue={product.barcode ?? ""}
					/>
				</Field>
				<GenerateBarcode id={product.id} barcode={product.barcode} />
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
				<Await state={images}>
					{(images) => <DeleteBtn id={product.id} name={product.name} images={images} />}
				</Await>
			</div>
			{error?.global === "" ? null : <TextError>{error?.global ?? ""}</TextError>}
		</form>
	);
}

function GenerateBarcode({ id, barcode }: { id: number; barcode: string | null }) {
	const db = useDB();
	const { error, loading, setError, action } = useAction("", () => db.product.generateBarcode(id));
	if (barcode !== null) {
		return null;
	}
	const handleClick = async () => {
		if (loading) return;
		const [errMsg] = await action();
		setError(errMsg);
		if (errMsg === null) {
			emitter.emit("fetch-product");
		}
	};
	return (
		<Button type="button" variant="ghost" onClick={handleClick}>
			{loading ? <Loader2 className="animate-spin" /> : <RefreshCw size={35} />}
			{error ? <TextError>{error}</TextError> : null}
		</Button>
	);
}
