import { Link, LoaderFunctionArgs, RouteObject, useNavigate } from "react-router";
import { z } from "zod";
import { numeric, numerish } from "../../utils";
import { useState } from "react";
import { Field } from "./Field";
import { insert } from "./insert";
import { Button } from "../../components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Input } from "../../components/ui/input";

export const route: RouteObject = {
	Component: Page,
	loader,
	path: "new",
};

export async function loader({}: LoaderFunctionArgs) {}
const dataSchema = z.object({
	name: z.string().min(1),
	price: numerish,
	stock: numeric,
	barcode: numerish.nullable(),
});

export default function Page() {
	const navigate = useNavigate();
	const [error, setError] = useState({ name: "", price: "", stock: "", barcode: "", global: "" });
	const [loading, setLoading] = useState(false);
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
		insert(parsed.data).then((err) => {
			if (err) {
				setError({ global: err, barcode: "", name: "", price: "", stock: "" });
				setLoading(false);
				return;
			}
			setLoading(false);
			navigate("/stock");
		});
	};
	return (
		<main className="p-2">
			<Button asChild variant="link">
				<Link to="/stock">
					{" "}
					<ChevronLeft /> Kembali
				</Link>
			</Button>
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
				<Button className="w-fit" type="submit">
					Simpan
				</Button>
				{loading && <p>Loading...</p>}
				{error.global === "" ? null : <p className="text-red-500">{error.global}</p>}
			</form>
		</main>
	);
}
