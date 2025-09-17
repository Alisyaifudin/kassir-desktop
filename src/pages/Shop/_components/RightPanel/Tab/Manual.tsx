import { Button } from "~/components/ui/button";
import { Field } from "../../Field";
import { Input } from "~/components/ui/input";
import { useManual } from "../../../_hooks/use-manual";
import { useFix } from "../../../_hooks/use-fix";
import { Show } from "~/components/Show";
import { LocalContext } from "~/pages/shop/_hooks/use-local-state";
import { useMode } from "~/pages/shop/_hooks/use-mode";
import { TextError } from "~/components/TextError";
import { useCallback } from "react";

export function Manual({ products, context }: { products: DB.Product[]; context: LocalContext }) {
	const { handleSubmit, error, refs, data, set } = useManual(products, context);
	const [fix] = useFix(context);
	const [mode] = useMode(context);
	const handleEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key !== "Enter") return;
		handleSubmit();
	};
	const handleEnterBarcode = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
		const input = refs.name.current;
		if (input === null || e.key !== "Enter") return;
		input.focus();
	}, []);
	const handleEnterName = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			const input = mode === "sell" ? refs.qty.current : refs.stock.current;
			if (input === null || e.key !== "Enter") return;
			input.focus();
		},
		[mode]
	);
	const handleEnterQty = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
		const input = refs.stock.current;
		if (input === null || e.key !== "Enter") return;
		input.focus();
	}, []);
	const handleEnterStock = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
		const input = refs.price.current;
		if (input === null || e.key !== "Enter") return;
		input.focus();
	}, []);
	return (
		<div className="flex flex-col gap-2 grow shrink px-1 basis-0 overflow-y-auto">
			<Field label="Barcode" error={error.barcode}>
				<Input
					ref={refs.barcode}
					type="text"
					name="barcode"
					value={data.barcode}
					onChange={(e) => set.barcode(e.currentTarget.value)}
					onKeyDown={handleEnterBarcode}
					aria-autocomplete="list"
				/>
			</Field>
			<Field label="Nama*" error={error.name}>
				<Input
					type="text"
					ref={refs.name}
					required
					name="name"
					value={data.name}
					onChange={(e) => set.name(e.currentTarget.value)}
					aria-autocomplete="list"
					onKeyDown={handleEnterName}
				/>
			</Field>
			<div className="flex gap-1 items-center">
				<Show when={mode === "sell"}>
					<Field label="Kuantitas*">
						<Input
							type="number"
							value={data.qty}
							ref={refs.qty}
							onKeyDown={handleEnterQty}
							onChange={(e) => set.qty(e.currentTarget.value)}
							required
							name="qty"
							aria-autocomplete="list"
						/>
					</Field>
				</Show>
				<Field label="Stok*">
					<Input
						type="number"
						required
						ref={refs.stock}
						name="stock"
						value={data.stock}
						onKeyDown={handleEnterStock}
						onChange={(e) => set.stock(e.currentTarget.value)}
						aria-autocomplete="list"
					/>
				</Field>
			</div>
			<TextError>{error.qty}</TextError>
			<Field label="Harga*">
				<div className="flex items-center gap-1">
					<p className="text-2xl">Rp</p>
					<Input
						type="number"
						required
						name="price"
						step={1 / Math.pow(10, fix)}
						aria-autocomplete="list"
						value={data.price}
						ref={refs.price}
						onChange={(e) => set.price(e.currentTarget.value)}
						onKeyDown={handleEnter}
					/>
				</div>
			</Field>
			<Button onClick={handleSubmit} type="button">
				Tambahkan
			</Button>
		</div>
	);
}
