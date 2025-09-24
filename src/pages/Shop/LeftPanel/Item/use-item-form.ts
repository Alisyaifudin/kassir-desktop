import { useEffect, useState } from "react";
import { useItems } from "~/pages/Shop/use-items";
import { useDebouncedCallback } from "use-debounce";
import { ItemTransform } from "~/pages/Shop/util-generate-record";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { useMode } from "~/pages/Shop/use-mode";

export function useItemForm(index: number, item: ItemTransform) {
	const [mode] = useMode();
	const [formItem, setFormItem] = useState({
		name: item.name,
		price: item.price.toString(),
		barcode: item.barcode ?? "",
		qty: item.qty.toString(),
	});
	useEffect(() => {
		if (item.qty !== Number(formItem.qty)) {
			setFormItem({ ...formItem, qty: item.qty.toString() });
		}
	}, [item.qty]);
	const productId = item.productId;
	const debounceName = useDebouncedCallback((v: string) => {
		setItems.name(index, v);
		// weird hack. dont know the root cause 😭
		// setTimeout(() => {
		// 	const input = document.getElementById(`name-${index}`) as HTMLInputElement | null;
		// 	input?.focus();
		// }, 1);
	}, DEBOUNCE_DELAY);
	const debounceBarcode = useDebouncedCallback((v: string) => {
		setItems.barcode(index, v);
	}, DEBOUNCE_DELAY);
	const debouncePrice = useDebouncedCallback(
		(v: number) => setItems.price(index, v),
		DEBOUNCE_DELAY
	);
	const debounceQty = useDebouncedCallback((v: number) => setItems.qty(index, v), DEBOUNCE_DELAY);
	const [_, setItems] = useItems();
	const handleChange = {
		name: (e: React.ChangeEvent<HTMLInputElement>) => {
			if (productId !== undefined) {
				return;
			}
			const val = e.currentTarget.value;
			setFormItem({ ...formItem, name: val });
			debounceName(val);
		},
		barcode: (e: React.ChangeEvent<HTMLInputElement>) => {
			if (productId !== undefined) {
				return;
			}
			const val = e.currentTarget.value.trim();
			setFormItem({ ...formItem, barcode: val });
			debounceBarcode(val);
		},
		price: (e: React.ChangeEvent<HTMLInputElement>) => {
			const str = e.currentTarget.value;
			const val = Number(str);
			if ((mode === "sell" && productId !== undefined) || isNaN(val) || val < 0) {
				return;
			}
			setFormItem({ ...formItem, price: str });
			debouncePrice(val);
		},
		qty: (e: React.ChangeEvent<HTMLInputElement>) => {
			const str = e.currentTarget.value;
			const val = Number(e.currentTarget.value);
			if (isNaN(val) || !Number.isInteger(val) || val < 0) {
				return;
			}
			setFormItem({ ...formItem, qty: str });
			debounceQty(val);
		},
		del: () => {
			setItems.del(index);
		},
	};
	return { handleChange, formItem };
}
