import { Button } from "~/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Input } from "~/components/ui/input";
import { TextError } from "~/components/TextError";
import { Textarea } from "~/components/ui/textarea";
import { Field } from "../Field";
import { Form, Link, useLoaderData } from "react-router";
import { Loader } from "./loader";
import { cn, sizeClass } from "~/lib/utils";
import { Barcode } from "./Barcode";
import { Spinner } from "~/components/Spinner";
import { useAction } from "~/hooks/use-action";
import { Action } from "./action";
import { useLoading } from "~/hooks/use-loading";
// import { useRef } from "react";

export default function Page() {
	const size = useLoaderData<Loader>();
	const loading = useLoading();
	const error = useAction<Action>()("new");
	return (
		<main className={cn("p-2 mx-auto w-full max-w-5xl flex flex-col gap-2", sizeClass[size])}>
			<Button asChild variant="link" className="self-start">
				<Link to="/stock">
					{" "}
					<ChevronLeft /> Kembali
				</Link>
			</Button>
			<h1 className="font-bold text-big">Tambah barang</h1>
			<Form method="POST" className="flex flex-col gap-2 text-normal">
				<input type="hidden" name="action" value="new"></input>
				<Field error={error?.name} label="Nama*:">
					<Input
						type="text"
						className="outline w-full"
						name="name"
						required
						aria-autocomplete="list"
					/>
				</Field>
				<Field error={error?.price} label="Harga*:">
					<Input
						type="number"
						className="outline w-[300px]"
						name="price"
						required
						aria-autocomplete="list"
					/>
				</Field>
				<Field error={error?.capital} label="Modal:">
					<Input
						type="number"
						className="outline w-[300px]"
						name="capital"
						aria-autocomplete="list"
						step={0.00001}
					/>
				</Field>
				<Field error={error?.stock} label="Stok*:">
					<Input
						type="number"
						className="outline w-[100px]"
						name="stock"
						required
						aria-autocomplete="list"
					/>
				</Field>
				<Field error={error?.stock} label="Gudang:">
					<Input
						type="number"
						className="outline w-[100px]"
						name="stock-back"
						aria-autocomplete="list"
					/>
				</Field>
				<Barcode error={error?.barcode} />
				<label className="flex flex-col">
					<div className="grid grid-cols-[120px_1fr] gap-2 items-center">
						<span className="text-normal">Catatan</span>
						<Textarea name="note" rows={3} />
					</div>
					{error?.note === "" ? null : (
						<div className="flex gap-2">
							<div className="w-[120px]"></div>
							<TextError>{error?.note ?? ""}</TextError>
						</div>
					)}
				</label>
				<Button className="w-fit" type="submit">
					Simpan
					<Spinner when={loading} />
				</Button>
				<TextError>{error?.global}</TextError>
			</Form>
		</main>
	);
}
