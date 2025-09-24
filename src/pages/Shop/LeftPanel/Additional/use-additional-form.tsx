import { useState } from "react";
import { useAdditional } from "~/pages/Shop/use-additional";
import { useDebouncedCallback } from "use-debounce";
import { z } from "zod";
import { AdditionalTransfrom } from "~/pages/Shop/util-generate-record";
import { DEBOUNCE_DELAY } from "~/lib/constants";

export function useAdditionalForm(index: number, initAdd: AdditionalTransfrom) {
	const [additional, setAdditional] = useState({
		kind: initAdd.kind,
		value: initAdd.value.toString(),
		name: initAdd.name,
		saved: initAdd.saved,
	});
	const [_, setAdditionals] = useAdditional();
	const debounceName = useDebouncedCallback(
		(v: string) => setAdditionals.name(index, v),
		DEBOUNCE_DELAY
	);
	const debounceValue = useDebouncedCallback(
		(v: number) => setAdditionals.value(index, v),
		DEBOUNCE_DELAY
	);
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
		changeSaved: (e: React.ChangeEvent<HTMLInputElement>) => {
			const check = e.currentTarget.checked;
			setAdditional({ ...additional, saved: check });
			setAdditionals.saved(index, check);
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
			if (isNaN(val)) {
				return;
			}
			setAdditional({ ...additional, value: str });
			debounceValue(val);
		},
		del: () => setAdditionals.del(index),
	};
	return { additional, handle };
}
