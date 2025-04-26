import {
	Link,
	LoaderFunctionArgs,
	redirect,
	useLoaderData,
	useNavigate,
} from "react-router";
import { z } from "zod";
import { numeric } from "../../../utils.ts";
import { useState } from "react";
import { Field } from "../Field.tsx";
import { Button } from "../../../components/ui/button.tsx";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Input } from "../../../components/ui/input.tsx";
import { DeleteBtn } from "./DeleteBtn.tsx";
import { useDb } from "../../../Layout.tsx";
import Redirect from "../../../components/Redirect.tsx";
import { Await } from "../../../components/Await.tsx";
import { useFetch } from "../../../hooks/useFetch.tsx";
import { TextError } from "../../../components/TextError.tsx";

export async function loader({ params }: LoaderFunctionArgs) {
	const parsed = numeric.safeParse(params.id);
	if (!parsed.success) {
		return redirect("/stock");
	}
	return { id: parsed.data };
}
const dataSchema = z.object({
	name: z.string().min(1),
	price: numeric,
	stock: numeric,
	barcode: z
		.string()
		.refine((v) => !Number.isNaN(v))
		.transform((v) => (v === "" ? null : Number(v))),
	id: z.number(),
});

export default function Page() {
	const { id } = useLoaderData<typeof loader>();
	const item = useItem(id);
	return (
		<main className="p-2 mx-auto w-full max-w-5xl flex flex-col gap-2">
			<Button asChild variant="link" className="self-start">
				<Link to="/stock">
					{" "}
					<ChevronLeft /> Kembali
				</Link>
			</Button>
			<h1 className="font-bold text-3xl">Edit barang</h1>
			<Await state={item} Loading={<Loader2 className="animate-spin" />}>
				{(data) => {
					const [errMsg, product] = data;
					if (errMsg !== null) {
						return <p className="text-red-500">{errMsg}</p>;
					}
					if (product === null) {
						return <Redirect to="/stock" />;
					}
					return <Form product={product} />;
				}}
			</Await>
		</main>
	);
}

function Form({ product }: { product: DB.Product }) {
	const db = useDb();
	const [error, setError] = useState({ name: "", price: "", stock: "", barcode: "", global: "" });
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
			id: product.id,
		});
		if (!parsed.success) {
			const errs = parsed.error.flatten().fieldErrors;
			setError({
				name: errs.name?.join("; ") ?? "",
				price: errs.price?.join("; ") ?? "",
				stock: errs.stock?.join("; ") ?? "",
				barcode: errs.barcode?.join("; ") ?? "",
				global: "",
			});
			return;
		}
		setLoading(true);
		db.product.update(parsed.data).then((err) => {
			if (err) {
				setError({ global: err, barcode: "", name: "", price: "", stock: "" });
				setLoading(false);
				return;
			}
			setLoading(false);
			navigate(-1);
		});
	};
	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-2">
			<Field error={error.name} label="Name*:">
				<Input type="text" className="outline" name="name" required defaultValue={product.name} />
			</Field>
			<Field error={error.price} label="Harga*:">
				<Input
					type="number"
					className="outline w-[300px]"
					name="price"
					required
					defaultValue={product.price}
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
					type="number"
					className="outline w-[300px]"
					name="barcode"
					defaultValue={product.barcode ?? ""}
				/>
			</Field>
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
	const item = useFetch(db.product.get(id), []);
	return item;
};
