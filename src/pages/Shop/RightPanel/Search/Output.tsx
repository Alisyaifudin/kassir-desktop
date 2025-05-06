import { cn } from "../../../../lib/utils";
import { ItemWithoutDisc } from "../../schema";

export function Output({
	products,
	handleClick,
	mode,
}: {
	mode: "buy" | "sell";
	products: DB.Product[];
	handleClick: (item: ItemWithoutDisc) => void;
}) {
	return (
		<div className="h-full w-full grow shrink basis-0 overflow-y-auto">
			<ol className="flex flex-col gap-1">
				{products.map((product, i) => (
					<li key={i} className={i % 2 === 0 ? "bg-muted" : ""}>
						<button
							onClick={() =>
								handleClick({
									id: product.id,
									stock: product.stock,
									name: product.name,
									price: product.price,
									barcode: product.barcode,
									qty: 1,
								})
							}
							className={cn(
								"cursor-pointer text-2xl w-full grid hover:bg-sky-100/50",
								product.barcode !== null ? "grid-cols-[1fr_170px]" : "",
								{ "bg-red-400 hover:bg-red-300": product.stock === 0 && mode === "sell" }
							)}
						>
							<p className={cn("text-start text-wrap")}>{product.name}</p>
							{product.barcode !== null ? <p className="text-start">{product.barcode}</p> : null}
						</button>
					</li>
				))}
			</ol>
		</div>
	);
}
