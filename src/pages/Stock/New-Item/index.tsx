import { Link, RouteObject, useNavigate } from "react-router";
import { z } from "zod";
import { numeric } from "../../../utils";
import { useState } from "react";
import { Field } from "./Field";
import { Button } from "../../../components/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Input } from "../../../components/ui/input";
import { useDb } from "../../../Layout";
import { TextError } from "../../../components/TextError";

export const route: RouteObject = {
	Component: Page,
	path: "new",
};

const dataSchema = z.object({
	name: z.string().min(1),
	price: numeric,
	stock: numeric,
	barcode: numeric.nullable(),
});

export default function Page() {
	const navigate = useNavigate();
	const [error, setError] = useState({ name: "", price: "", stock: "", barcode: "", global: "" });
	const [loading, setLoading] = useState(false);
	const db = useDb();
	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = dataSchema.safeParse({
			name: formData.get("name"),
			price: formData.get("price"),
			stock: formData.get("stock"),
			barcode: formData.get("barcode"),
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
		db.product.insert(parsed.data).then((err) => {
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
		<main className="p-2 mx-auto w-full max-w-2xl flex flex-col gap-2">
			<Button asChild variant="link" className="self-start">
				<Link to="/stock">
					{" "}
					<ChevronLeft /> Kembali
				</Link>
			</Button>
			<h1 className="font-bold text-3xl">Tambah barang</h1>
			<form onSubmit={handleSubmit} className="flex flex-col gap-2">
				<Field error={error.name} label="Name*:">
					<Input type="text" className="outline w-[400px]" name="name" required />
				</Field>
				<Field error={error.price} label="Harga*:">
					<Input type="number" className="outline w-[300px]" name="price" required />
				</Field>
				<Field error={error.stock} label="Stok*:">
					<Input type="number" className="outline w-[100px]" name="stock" required />
				</Field>
				<Field error={error.barcode} label="Barcode:">
					<Input type="number" className="outline w-[300px]" name="barcode" />
				</Field>
				<Button className="w-fit text-3xl" type="submit">
					Simpan
					{loading && <Loader2 className="animate-spin" />}
				</Button>
				{error.global === "" ? null : <TextError>{error.global}</TextError>}
			</form>
		</main>
	);
}
