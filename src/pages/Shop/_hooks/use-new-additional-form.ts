import { useRef, useState } from "react";
import { useAdditional } from "./use-additional";
import { LocalContext } from "./use-local-state";

// const additionalSchema = z.object({
// 	name: z.string().min(1, { message: "Harus punya nama" }).trim(),
// 	value: z
// 		.string()
// 		.refine((v) => !isNaN(Number(v)))
// 		.transform((v) => Number(v)),
// 	kind: z.enum(["percent", "number"]),
// 	saved: z
// 		.literal("on")
// 		.nullable()
// 		.transform((v) => v === "on"),
// });

const emptyErrs = { name: "", value: "" };
type Data = {
	name: string;
	kind: DB.ValueKind;
	value: string;
	saved: boolean;
};
const emptyData: Data = {
	name: "",
	kind: "percent",
	value: "",
	saved: false,
};

export function useNewAdditionalForm(context: LocalContext) {
	const [error, setError] = useState(emptyErrs);
	const [data, setData] = useState<Data>(emptyData);
	const nameRef = useRef<HTMLInputElement>(null);
	const valueRef = useRef<HTMLInputElement>(null);
	const [_, setAdditional] = useAdditional(context);
	const set = {
		name: (v: string) => {
			setData((prev) => ({ ...prev, name: v }));
			setError((prev) => ({ ...prev, name: "" }));
		},
		value: (v: string) => {
			if (v.trim() === "") {
				setData((prev) => ({ ...prev, value: "" }));
				setError((prev) => ({ ...prev, value: "" }));
				return;
			}
			const num = Number(v);
			if (isNaN(num)) return;
			setData((prev) => ({ ...prev, value: v }));
			setError((prev) => ({ ...prev, value: "" }));
		},
		kind: (v: string) => {
			if (v !== "percent" && v !== "number") return;
			setData((prev) => ({ ...prev, kind: v }));
		},
		saved: (v: boolean) => {
			setData((prev) => ({ ...prev, saved: v }));
		},
	};
	const handleSubmit = () => {
		const value = Number(data.value);
		const { name, kind, saved } = data;
		if (name.trim() === "") {
			setError((prev) => ({ ...prev, name: "Harus ada" }));
			nameRef.current?.focus();
			return;
		}
		if (isNaN(value)) return;
		if (kind === "percent" && value < -100) {
			setError((prev) => ({ ...prev, value: "Minimal 100" }));
			valueRef.current?.focus();
			return;
		}
		if (kind === "percent" && value > 100) {
			setError((prev) => ({ ...prev, value: "Maksimal 100" }));
			valueRef.current?.focus();
			return;
		}

		setError(emptyErrs);
		setAdditional.add({
			name: name.trim(),
			kind,
			saved,
			value,
		});
		setData(emptyData);
	};
	const refs = {
		name: nameRef,
		value: valueRef,
	};
	return { error, handleSubmit, data, set, refs };
}
