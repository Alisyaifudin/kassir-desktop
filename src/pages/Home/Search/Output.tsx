import { cn } from "../../../lib/utils";

export function Output({
	products,
	handleClick,
}: {
	products: DB.Product[];
	handleClick: (data: {
		name: string;
		price: string;
		stock: number;
		id: number;
		barcode?: string;
	}) => void;
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
									name: product.name,
									price: product.price.toString(),
									stock: product.stock,
									barcode: product.barcode ?? undefined,
								})
							}
							className={cn(
								"cursor-pointer text-2xl w-full grid hover:bg-sky-100/50",
								product.barcode !== null ? "grid-cols-[1fr_170px]" : ""
							)}
						>
							<p className="text-start text-wrap">{product.name}</p>
							{product.barcode !== null ? <p className="text-start">{product.barcode}</p> : null}
						</button>
					</li>
				))}
			</ol>
		</div>
	);
}
