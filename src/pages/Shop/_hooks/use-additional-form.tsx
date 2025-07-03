import { useState } from "react";
import { useAdditional } from "./use-additional";
import { useDebouncedCallback } from "use-debounce";
import { z } from "zod";
import { LocalContext } from "./use-local-state";
import { AdditionalTransfrom } from "../_utils/generate-record";
import { DEBOUNCE_DELAY } from "~/lib/constants";

export function useAdditionalForm(index: number, initAdd: AdditionalTransfrom, context: LocalContext) {
	const [additional, setAdditional] = useState({
		kind: initAdd.kind,
		value: initAdd.value.toString(),
		name: initAdd.name,
	});
	const [_, setAdditionals] = useAdditional(context);
	const debounceName = useDebouncedCallback((v: string) => setAdditionals.name(index, v), DEBOUNCE_DELAY);
	const debounceValue = useDebouncedCallback((v: number) => setAdditionals.value(index, v), DEBOUNCE_DELAY);
	const debounceKind = useDebouncedCallback(
		(v: DB.ValueKind) => setAdditionals.kind(index, v),
		DEBOUNCE_DELAY
	);

	const handle = {
		changeName: (e: React.ChangeEvent<HTMLInputElement>) => {
			const name = e.currentTarget.value.trimStart();
			setAdditional({ ...additional, name });
			debounceName(name);
		},
		changeKind: (e: React.ChangeEvent<HTMLSelectElement>) => {
			const kind = z.enum(["percent", "number"]).catch("percent").parse(e.currentTarget.value);
			let value = additional.value;
			if (kind === "percent" && Number(additional.value) > 100) {
				value = "100";
				debounceValue(100);
			}
			setAdditional({ ...additional, kind, value });
			debounceKind(kind);
		},
		changeValue: (e: React.ChangeEvent<HTMLInputElement>) => {
			const str = e.currentTarget.value;
			const val = Number(str);
			if (isNaN(val) || val < 0) {
				return;
			}
			setAdditional({ ...additional, value: str });
			debounceValue(val);
		},
		del: () => setAdditionals.del(index),
	};
	return { additional, handle };
}
