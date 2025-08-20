import { X } from "lucide-react";
import { cn } from "~/lib/utils";
import { Discount } from "./DiscountDialog";
import { DetailDialog } from "./DetailDialog";
import { ItemTransform } from "../../_utils/generate-record";
import { useItemForm } from "../../_hooks/use-item-form";
import { Either } from "~/components/Either";
import { useFix } from "../../_hooks/use-fix";
import { Discounts } from "./Discounts";
import { LocalContext } from "../../_hooks/use-local-state";
import { Context } from "../../Shop";

type Props = {
	index: number;
	mode: "sell" | "buy";
	item: ItemTransform;
	localContext: LocalContext;
	context: Context;
};

export function ItemComponent({ index, mode, item, context, localContext }: Props) {
	const { handleChange, formItem } = useItemForm(mode, index, item, localContext);
	const { name, price, barcode, qty } = formItem;
	const [fix] = useFix(localContext);
	const productId = item.productId;
	return (
		<div
			className={cn("grid grid-cols-[70px_1fr] items-center text-3xl py-0.5", {
				"bg-muted": index % 2 == 0,
			})}
		>
			<div className="flex justify-center items-center">
				<Either
					if={productId === undefined}
					then={<p className="text-center">{index + 1}</p>}
					else={
						<DetailDialog
							index={index}
							productId={productId ?? 0}
							stock={item.stock ?? 0}
							name={name}
							context={context}
						/>
					}
				/>
			</div>
			<div className="flex flex-col">
				<Either
					if={productId === undefined}
					then={
						<input
							type="text"
							value={name}
							className="px-0.5 outline"
							onChange={(e) => handleChange.name(e)}
						></input>
					}
					else={<p>{name}</p>}
				/>
				<div className="grid gap-1 grid-cols-[1fr_150px_230px_70px_150px_50px]">
					<Either
						if={productId === undefined}
						then={
							<input
								type="text"
								value={barcode}
								className="px-0.5 border-b border-l border-r"
								onChange={handleChange.barcode}
							></input>
						}
						else={<p>{barcode}</p>}
					/>
					<Either
						if={productId === undefined || mode === "buy"}
						then={
							<input
								type="number"
								className={cn(
									"px-0.5",
									productId !== undefined ? "outline" : "border-b border-l border-r"
								)}
								value={price}
								onChange={handleChange.price}
								step={1 / Math.pow(10, fix)}
							></input>
						}
						else={<p>{Number(Number(price).toFixed(fix)).toLocaleString("id-ID")}</p>}
					/>
					<Discount item={item} itemIndex={index} context={localContext} />
					<input
						type="number"
						className={cn(
							"px-0.5",
							productId !== undefined ? "outline" : "border-b border-l border-r"
						)}
						value={qty}
						onChange={handleChange.qty}
						pattern="[1-9][0-9]*"
					></input>
					<p>{Number(item.grandTotal.toFixed(fix)).toLocaleString("id-ID")}</p>
					<div className="py-0.5 flex items-center">
						<button onClick={handleChange.del} className="bg-red-500 text-white">
							<X size={35} />
						</button>
					</div>
				</div>
				<Discounts discs={item.discs} />
			</div>
		</div>
	);
}
