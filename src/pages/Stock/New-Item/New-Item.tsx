import { useNavigate } from "react-router";
import { z } from "zod";
import { numeric } from "~/lib/utils";
import { useEffect, useRef } from "react";
import { Field } from "../Field";
import { Button } from "~/components/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Input } from "~/components/ui/input";
import { useDB } from "~/RootLayout";
import { TextError } from "~/components/TextError";
import { Textarea } from "~/components/ui/textarea";
import { useAction } from "~/hooks/useAction";
import { useProducts } from "~/Layout";

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

export default function Page() {
	const navigate = useNavigate();
	const ref = useRef<HTMLInputElement | null>(null);
	const db = useDB();
	const {revalidate} = useProducts();
	const { action, error, loading, setError } = useAction(
		emptyErrs,
		(data: z.infer<typeof dataSchema>) => db.product.insert(data)
	);
	useEffect(() => {
		if (!ref.current) {
			return;
		}
		ref.current.focus();
	}, []);
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
			setError({
				...emptyErrs,
				global: errMsg,
			});
			return;
		}
		revalidate();
		navigate(-1);
	};
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
				<Field error={error?.name ?? ""} label="Nama*:">
					<Input
						ref={ref}
						type="text"
						className="outline w-full"
						name="name"
						required
						autoComplete="off"
					/>
				</Field>
				<Field error={error?.price ?? ""} label="Harga*:">
					<Input
						type="number"
						className="outline w-[300px]"
						name="price"
						required
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
					/>
				</Field>
				<Field error={error?.stock ?? ""} label="Stok*:">
					<Input
						type="number"
						className="outline w-[100px]"
						name="stock"
						required
						autoComplete="off"
					/>
				</Field>
				<Field error={error?.barcode ?? ""} label="Barcode:">
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
				{error?.global === "" ? null : <TextError>{error?.global ?? ""}</TextError>}
			</form>
		</main>
	);
}
