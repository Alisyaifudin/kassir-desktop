import { ExternalLink, Lock } from "lucide-react";
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
import { TextError } from "~/components/TextError";
import { useProducts } from "~/hooks/useProducts";
import { Database } from "~/database";
import { Async } from "~/components/Async";
import { useLinkProduct } from "../../_hooks/use-link-product";
import { Show } from "~/components/Show";
import { Spinner } from "~/components/Spinner";

export function LinkProductList({
	item,
	revalidate,
	context,
}: {
	item: DB.RecordItem;
	revalidate: () => void;
	context: { db: Database };
}) {
	const state = useProducts(context);
	return (
		<Async state={state}>
			{(products) => (
				<LinkProduct item={item} products={products} revalidate={revalidate} context={context} />
			)}
		</Async>
	);
}

export function LinkProduct({
	item,
	products,
	revalidate,
	context,
}: {
	item: DB.RecordItem;
	products: DB.Product[];
	revalidate: () => void;
	context: { db: Database };
}) {
	const { error, handleChange, handleClick, loading, query, shown, selected } = useLinkProduct(
		item,
		products,
		revalidate,
		context
	);
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
						<TextError>{error}</TextError>
						<Show value={selected} fallback={<p>--Kosong--</p>}>
							{(selected) => (
								<div className="flex gap-5 items-center">
									{selected.barcode === null || selected.barcode === "" ? null : (
										<p>{selected.barcode}</p>
									)}
									<p>{selected.name}</p>
									<p>Rp{selected.price.toLocaleString("id-ID")}</p>
								</div>
							)}
						</Show>
						<Spinner when={loading} />
					</div>
				</div>
				<Input type="search" placeholder="Cari.." value={query} onChange={handleChange} />
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
