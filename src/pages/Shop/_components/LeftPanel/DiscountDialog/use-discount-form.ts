import { useState } from "react";
import { useItems } from "../../../_hooks/use-items";
import { useDebouncedCallback } from "use-debounce";
import { z } from "zod";
import { produce } from "immer";
import { integer } from "~/lib/utils";
import { Item } from "../../../../_utils/util-schema";
import { DEBOUNCE_DELAY } from "~/lib/constants";

export function useDiscountForm(itemIndex: number, initDiscs: Item["discs"]) {
	const [discs, setDiscs] = useState(
		initDiscs.map((d) => ({
			value: d.value.toString(),
			kind: d.kind,
		}))
	);
	const [_, setItems] = useItems();
	const debouncedKind = useDebouncedCallback((index: number, kind: "percent" | "number") => {
		setItems.discs.kind(itemIndex, index, kind);
	}, DEBOUNCE_DELAY);
	const debouncedVal = useDebouncedCallback((index: number, value: number) => {
		setItems.discs.value(itemIndex, index, value);
	}, DEBOUNCE_DELAY);
	const handle = {
		changeKind: (index: number) => (e: React.ChangeEvent<HTMLSelectElement>) => {
			const kind = z.enum(["percent", "number"]).catch("percent").parse(e.currentTarget.value);
			setDiscs((state) =>
				produce(state, (draft) => {
					draft[index].kind = kind;
					if (kind === "percent" && Number(draft[index].value) > 100) {
						draft[index].value = "100";
						debouncedVal(index, 100);
					}
				})
			);
			debouncedKind(index, kind);
		},
		changeValue: (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
			const str = e.currentTarget.value;
			const value = integer.catch(0).parse(str);
			if (value < 0) {
				return;
			}
			setDiscs((state) =>
				produce(state, (draft) => {
					let v = str;
					if (draft[index].kind === "percent" && value > 100) {
						v = "100";
					}
					draft[index].value = v;
				})
			);
			debouncedVal(index, value);
		},
		del: (index: number) => () => {
			setDiscs((state) => state.filter((_, i) => i !== index));
			setItems.discs.del(itemIndex, index);
		},
		add: () => {
			setDiscs([...discs, { kind: "percent", value: "" }]);
			setItems.discs.add(itemIndex);
		},
	};
	return { handle, discs };
}
