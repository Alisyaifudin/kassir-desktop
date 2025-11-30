import { X } from "lucide-react";
import { cn } from "~/lib/utils";
import { Discount } from "../DiscountDialog";
import { DetailDialog } from "../DetailDialog";
import { useItemForm } from "./use-item-form";
import { Either } from "~/components/Either";
import { useFix } from "~/pages/Shop/use-fix";
import { Discounts } from "../Discounts";
import { useMode } from "~/pages/Shop/use-mode";
import { ItemTransform } from "~/pages/Shop/util-generate-record";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

type Props = {
	index: number;
	item: ItemTransform;
};

const localStyle = {
	big: {
		topLevel: {
			gridTemplateColumns: "70px 1fr",
		},
		inside: {
			gridTemplateColumns: "1fr 150px 230px 70px 150px 50px",
		},
	},
	small: {
		topLevel: {
			gridTemplateColumns: "40px 1fr",
		},
		inside: {
			gridTemplateColumns: "1fr 100px 140px 40px 100px 30px",
		},
	},
};

export function ItemComponent({ index, item }: Props) {
	const [mode] = useMode();
	const { handleChange, formItem } = useItemForm(index, item);
	const { name, price, barcode, qty } = formItem;
	const [fix] = useFix();
	const size = useSize();
	const productId = item.productId;
	return (
		<div
			style={localStyle[size].topLevel}
			className={cn("grid items-center text-3xl py-0.5", {
				"bg-muted": index % 2 == 0,
			})}
		>
			<div className="flex justify-center items-center">
				<Either
					if={productId === undefined}
					then={
						<p style={style[size].text} className="text-center">
							{index + 1}
						</p>
					}
					else={
						<DetailDialog
							index={index}
							productId={productId ?? 0}
							stock={item.stock ?? 0}
							name={name}
						/>
					}
				/>
			</div>
			<div className="flex flex-col">
				<Either
					if={productId === undefined}
					then={
						<input
							style={style[size].text}
							type="text"
							value={name}
							key={index}
							id={`name-${index}`}
							className="px-0.5 outline"
							onChange={(e) => handleChange.name(e)}
						></input>
					}
					else={<p style={style[size].text}>{name}</p>}
				/>
				<div className="grid gap-1" style={localStyle[size].inside}>
					<Either
						if={productId === undefined}
						then={
							<input
								style={style[size].text}
								type="text"
								value={barcode}
								className="px-0.5 border-b border-l border-r w-full"
								onChange={handleChange.barcode}
							></input>
						}
						else={<p style={style[size].text}>{barcode}</p>}
					/>
					<Either
						if={productId === undefined || mode === "buy"}
						then={
							<input
								style={style[size].text}
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
						else={
							<p style={style[size].text}>
								{Number(Number(price).toFixed(fix)).toLocaleString("id-ID")}
							</p>
						}
					/>
					<Discount item={item} itemIndex={index} />
					<input
						style={style[size].text}
						type="number"
						className={cn(
							"px-0.5",
							productId !== undefined ? "outline" : "border-b border-l border-r"
						)}
						value={qty}
						onChange={handleChange.qty}
						pattern="[1-9][0-9]*"
					></input>
					<p style={style[size].text}>
						{Number(item.grandTotal.toFixed(fix)).toLocaleString("id-ID")}
					</p>
					<div className="py-0.5 flex items-center">
						<button type="button" onClick={handleChange.del} className="bg-red-500 text-white">
							<X size={style[size].icon} />
						</button>
					</div>
				</div>
				<Discounts discs={item.discs} />
			</div>
		</div>
	);
}
