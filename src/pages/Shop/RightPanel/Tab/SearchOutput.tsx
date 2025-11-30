import { ProductResult } from "~/hooks/useProductSearch";
import { cn } from "~/lib/utils";
import { Additional, ItemWithoutDisc } from "~/pages/Shop/util-schema";
import { Show } from "~/components/Show";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

export function Output({
	products,
	additionals,
	handleClickAdditional,
	handleClickProduct,
	mode,
}: {
	mode: "buy" | "sell";
	products: ProductResult[];
	additionals: Additional[];
	handleClickProduct: (item: ItemWithoutDisc) => void;
	handleClickAdditional: (additional: Additional) => void;
}) {
	const size = useSize();
	return (
		<div className="h-[calc(100vh-200px)] bg-white absolute z-20 top-[150px] overflow-x-clip overflow-y-auto">
			<ol className="flex flex-col gap-1">
				<Show when={products.length > 0}>
					<p style={style[size].text} className="text-bold text-2xl italic">
						----Produk
					</p>
				</Show>
				{products.map((product, i) => (
					<li key={i} className={i % 2 === 0 ? "bg-muted" : ""}>
						<button
							style={style[size].text}
							type="button"
							onClick={() =>
								handleClickProduct({
									productId: product.id,
									stock: product.stock,
									name: product.name,
									price: product.price,
									barcode: product.barcode,
									qty: 1,
									capital: product.capital,
								})
							}
							className={cn(
								"cursor-pointer text-2xl w-full grid hover:bg-sky-100/50",
								product.barcode !== null ? "grid-cols-[1fr_150px]" : "",
								{ "bg-red-400 hover:bg-red-300": product.stock === 0 && mode === "sell" }
							)}
						>
							<p className={cn("text-start text-wrap")}>{product.name}</p>
							{product.barcode !== null ? <p className="text-start">{product.barcode}</p> : null}
						</button>
					</li>
				))}
				<Show when={additionals.length > 0}>
					<p style={style[size].text} className="text-bold text-2xl italic">
						----Biaya Lainnya
					</p>
				</Show>
				{additionals.map((product, i) => (
					<li key={i} className={i % 2 === 0 ? "bg-muted" : ""}>
						<button
							style={style[size].text}
							type="button"
							onClick={() =>
								handleClickAdditional({
									name: product.name,
									value: product.value,
									kind: product.kind,
									saved: product.saved,
								})
							}
							className={cn("cursor-pointer text-2xl w-full grid hover:bg-sky-100/50")}
						>
							<p className={cn("text-start text-wrap")}>{product.name}</p>
						</button>
					</li>
				))}
			</ol>
		</div>
	);
}
