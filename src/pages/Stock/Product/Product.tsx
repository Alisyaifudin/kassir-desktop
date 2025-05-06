import { useLoaderData, useNavigate } from "react-router";
import { z } from "zod";
import { numeric } from "../../../lib/utils.ts";
import { useState } from "react";
import { Field } from "../Field.tsx";
import { Button } from "../../../components/ui/button.tsx";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Input } from "../../../components/ui/input.tsx";
import { DeleteBtn } from "./DeleteBtn.tsx";
import { useDb } from "../../../RootLayout";
import Redirect from "../../../components/Redirect.tsx";
import { Await } from "../../../components/Await.tsx";
import { useAsync } from "../../../hooks/useAsync.tsx";
import { TextError } from "../../../components/TextError.tsx";
import { type loader } from "./index.tsx";
import { Textarea } from "../../../components/ui/textarea.tsx";
import { useUser } from "../../../Layout.tsx";

const dataSchema = z.object({
	name: z.string().min(1),
	price: numeric,
	stock: numeric,
	capital: z
		.string()
		.refine((v) => !Number.isNaN(v))
		.transform((v) => (v === "" ? 0 : Number(v))),
	barcode: z.string().transform((v) => (v === "" ? null : v)),
	note: z.string().transform((v) => (v === "" ? undefined : v)),
	id: z.number(),
});

export default function Page() {
	const { id } = useLoaderData<typeof loader>();
	const item = useItem(id);
	const user = useUser();
	const navigate = useNavigate();
	return (
		<main className="p-2 mx-auto w-full max-w-5xl flex flex-col gap-2">
			<Button asChild variant="link" className="self-start">
				<Button variant="link" onClick={() => navigate(-1)}>
					{" "}
					<ChevronLeft /> Kembali
				</Button>
			</Button>
			{user.role === "admin" ? (
				<h1 className="font-bold text-3xl">Edit barang</h1>
			) : (
				<h1 className="font-bold text-3xl">Info barang</h1>
			)}
			<Await state={item} Loading={<Loader2 className="animate-spin" />}>
				{(data) => {
					const [errMsg, product] = data;
					if (errMsg !== null) {
						return <p className="text-red-500">{errMsg}</p>;
					}
					if (product === null) {
						return <Redirect to="/stock" />;
					}
					if (user.role === "user") {
						return <Info product={product} />;
					}
					return <Form product={product} />;
				}}
			</Await>
		</main>
	);
}

function Info({ product }: { product: DB.Product }) {
	return (
		<div className="grid grid-cols-[150px_1fr] gap-3 text-3xl">
			<p>Nama</p>
			<p>{product.name}</p>
			<p>Harga</p>
			<p>{product.price}</p>
			<p>Modal</p>
			<p>{product.capital}</p>
			<p>Stok</p>
			<p>{product.stock}</p>
			<p>Barcode</p>
			<p>{product.barcode}</p>
			{product.note === "" ? null : (
				<>
					<p>Catatan</p>
					<p>{product.note}</p>
				</>
			)}
		</div>
	);
}

function Form({ product }: { product: DB.Product }) {
	const db = useDb();
	const [error, setError] = useState({
		name: "",
		price: "",
		stock: "",
		barcode: "",
		global: "",
		capital: "",
		note: "",
	});
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();
	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
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
		setLoading(true);
		db.product.update(parsed.data).then((err) => {
			if (err) {
				setError({
					global: err,
					barcode: "",
					name: "",
					price: "",
					stock: "",
					capital: "",
					note: "",
				});
				setLoading(false);
				return;
			}
			setLoading(false);
			navigate(-1);
		});
	};
	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-2">
			<Field error={error.name} label="Nama*:">
				<Input
					type="text"
					className="outline"
					name="name"
					required
					defaultValue={product.name}
					autoComplete="off"
				/>
			</Field>
			<Field error={error.price} label="Harga*:">
				<Input
					type="number"
					className="outline w-[300px]"
					name="price"
					required
					defaultValue={product.price}
					autoComplete="off"
				/>
			</Field>
			<Field error={error.capital} label="Modal:">
				<Input
					type="number"
					className="outline w-[300px]"
					name="capital"
					autoComplete="off"
					defaultValue={product.capital}
				/>
			</Field>
			<Field error={error.stock} label="Stok*:">
				<Input
					type="number"
					className="outline w-[100px]"
					name="stock"
					required
					defaultValue={product.stock}
				/>
			</Field>
			<Field error={error.barcode} label="Barcode:">
				<Input
					type="text"
					className="outline w-[300px]"
					name="barcode"
					defaultValue={product.barcode ?? ""}
				/>
			</Field>
			<label className="flex flex-col">
				<div className="grid grid-cols-[120px_1fr] gap-2 items-center">
					<span className="text-3xl">Catatan</span>
					<Textarea className="min-h-[300px]" name="note" defaultValue={product.note} />
				</div>
				{error.note === "" ? null : (
					<div className="flex gap-2">
						<div className="w-[120px]"></div>
						<TextError>{error.note}</TextError>
					</div>
				)}
			</label>
			<div className="flex items-center justify-between">
				<Button className="w-fit" type="submit">
					Simpan
					{loading && <Loader2 className="animate-spin" />}
				</Button>
				<DeleteBtn id={product.id} name={product.name} />
			</div>
			{error.global === "" ? null : <TextError>{error.global}</TextError>}
		</form>
	);
}

const useItem = (id: number) => {
	const db = useDb();
	const item = useAsync(db.product.get(id), []);
	return item;
};
