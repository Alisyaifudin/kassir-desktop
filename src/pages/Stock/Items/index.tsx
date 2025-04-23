import {
	Link,
	LoaderFunctionArgs,
	redirect,
	RouteObject,
	useLoaderData,
	useNavigate,
} from "react-router";
import { z } from "zod";
import { numeric, numerish } from "../../../utils";
import { useState } from "react";
import { Field } from "./Field";
import { Button } from "../../../components/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Input } from "../../../components/ui/input";
import Database from "@tauri-apps/plugin-sql";
import { update } from "./update";
import { DeleteBtn } from "./DeleteBtn";
import { useDb } from "../../../Layout";
import Redirect from "../../../components/Redirect";
import { Await } from "../../../components/Await";
import { useFetch } from "../../../hooks/useFetch";

export const route: RouteObject = {
	Component: Page,
	loader,
	path: "/items/:id",
};

export async function loader({ params }: LoaderFunctionArgs) {
	const parsed = numeric.safeParse(params.id);
	if (!parsed.success) {
		return redirect("/stock");
	}
	return { id: parsed.data };
}
const dataSchema = z.object({
	name: z.string().min(1),
	price: numerish,
	stock: numeric,
	barcode: numerish.nullable(),
	id: z.number(),
});

export default function Page() {
	const { id } = useLoaderData<typeof loader>();
	const item = useItem(id);
	return (
		<main className="p-2 mx-auto w-full max-w-2xl flex flex-col gap-2">
			<Button asChild variant="link" className="self-start">
				<Link to="/stock">
					{" "}
					<ChevronLeft /> Kembali
				</Link>
			</Button>
			<h1 className="font-bold text-3xl">Edit barang</h1>
			<Await state={item} Loading={<Loader2 className="animate-spin" />}>
				{(item) => {
					if (item === null) {
						return <Redirect to="/stock" />;
					}
					return <Form item={item} />;
				}}
			</Await>
		</main>
	);
}

function Form({ item }: { item: DB.Item }) {
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
			id: item.id,
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
		update(parsed.data).then((err) => {
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
				<Input type="text" className="outline" name="name" required defaultValue={item.name} />
			</Field>
			<Field error={error.price} label="Harga*:">
				<Input
					type="number"
					className="outline w-[300px]"
					name="price"
					required
					defaultValue={item.price}
				/>
			</Field>
			<Field error={error.stock} label="Stok*:">
				<Input
					type="number"
					className="outline w-[100px]"
					name="stock"
					required
					defaultValue={item.stock}
				/>
			</Field>
			<Field error={error.barcode} label="Barcode:">
				<Input
					type="number"
					className="outline w-[300px]"
					name="barcode"
					defaultValue={item.barcode ?? ""}
				/>
			</Field>
			<div className="flex items-center justify-between">
				<Button className="w-fit" type="submit">
					Simpan
					{loading && <Loader2 className="animate-spin" />}
				</Button>
				<DeleteBtn id={item.id} name={item.name} />
			</div>
			{error.global === "" ? null : <p className="text-red-500">{error.global}</p>}
		</form>
	);
}

const useItem = (id: number) => {
	const db = useDb();
	const item = useFetch(getItem(db, id));
	return item;
};

async function getItem(db: Database, id: number): Promise<DB.Item | null> {
	const items = await db.select<
		{
			name: string;
			price: string;
			barcode: string | null;
			stock: number;
			id: number;
		}[]
	>("SELECT * FROM items WHERE id = $1", [id]);
	if (items.length === 0) {
		return null;
	}
	return items[0];
}
