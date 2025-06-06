import { ExternalLink, Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { useDebouncedCallback } from "use-debounce";
import { useDB } from "~/RootLayout";
import { TextError } from "~/components/TextError";
import { ProductResult, useProductSearch } from "~/hooks/useProductSearch";
import { useAction } from "~/hooks/useAction";
import { emitter } from "~/lib/event-emitter";

export function LinkProduct({
	item,
	products,
}: {
	item: DB.RecordItem;
	products: DB.Product[];
}) {
	const [query, setQuery] = useState("");
	const [shown, setShown] = useState<ProductResult[]>([]);
	const selected =
		item.product_id === null ? undefined : products.find((p) => p.id === item.product_id);
	const { loading, action, error, setError } = useAction(
		"",
		(data: { itemId: number; productId: number }) =>
			db.recordItem.updateProductId(
				data.itemId,
				selected !== undefined && selected.id === data.productId ? null : data.productId
			)
	);
	const { search } = useProductSearch(products);
	const db = useDB();
	const debounced = useDebouncedCallback((value: string) => {
		if (value.trim() === "") {
			setShown([]);
		} else {
			const results = search(value.trim(), {
				fuzzy: (term) => {
					if (term.split(" ").length === 1) {
						return 0.1;
					} else {
						return 0.2;
					}
				},
				prefix: true,
				combineWith: "AND",
			});
			setShown(results);
		}
	}, 500);
	const handleClick = (itemId: number, productId: number) => async () => {
		const errMsg = await action({ itemId, productId });
		if (errMsg) {
			setError(errMsg);
			return;
		}
		setError("");
		emitter.emit("fetch-record-item");
	};
	return (
		<Dialog>
			<Button variant="ghost" size="icon" asChild>
				<DialogTrigger>{item.product_id ? <Lock /> : <ExternalLink />}</DialogTrigger>
			</Button>
			<DialogContent className="left-5 text-3xl top-5 bottom-5 right-5 w-[calc(100%-40px)] max-w-full translate-0 flex flex-col gap-2">
				<DialogHeader>
					<DialogTitle className="text-5xl">Hubungkan dengan produk</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col p-2 gap-2">
					<div className="flex items-center gap-5">
						<p className="">Barang:</p>
						<p>{item.name}</p>
						<p>Rp{item.price.toLocaleString("id-ID")}</p>
					</div>
					<div className="flex items-center gap-2">
						<p className="">Produk terhubung:</p>
						<TextError>{error ?? ""}</TextError>
						{selected === undefined ? (
							<p>--Kosong--</p>
						) : (
							<div className="flex gap-5 items-center">
								{selected.barcode === "" ? null : <p>{selected.barcode}</p>}
								<p>{selected.name}</p>
								<p>Rp{selected.price.toLocaleString("id-ID")}</p>
							</div>
						)}
						{loading ? <Loader2 className="animate-spin" /> : null}
					</div>
				</div>
				<Input
					type="search"
					placeholder="Cari.."
					value={query}
					onChange={(e) => {
						const val = e.currentTarget.value;
						setQuery(val);
						debounced(val);
					}}
				/>
				<Table>
					<TableHeader className="text-3xl">
						<TableRow>
							<TableHead className="w-[70px]">No</TableHead>
							<TableHead className="w-[200px]">Barcode</TableHead>
							<TableHead>Nama</TableHead>
							<TableHead className="text-right">Harga</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody className="overflow-auto text-3xl">
						{shown.map((product, i) => (
							<TableRow key={product.id}>
								<TableCell className="font-medium">
									<Button
										onClick={handleClick(item.id, product.id)}
										className="w-full"
										variant={
											selected !== undefined && selected.id === product.id ? "secondary" : "default"
										}
									>
										{i + 1}
									</Button>
								</TableCell>
								<TableCell>{product.barcode ?? ""}</TableCell>
								<TableCell>{product.name}</TableCell>
								<TableCell className="text-right">
									{product.price.toLocaleString("id-ID")}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</DialogContent>
		</Dialog>
	);
}
