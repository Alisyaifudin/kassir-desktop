import { useRef, useState } from "react";
import { Input } from "./ui/input";

// Format with Indonesian rules: "." for thousands, "," for decimals
function formatID(noSep: string) {
	let sign = "";
	if (noSep.startsWith("-")) {
		sign = "-";
		noSep = noSep.slice(1);
	}

	const hasComma = noSep.includes(",");
	const [intPart = "", fracPart = ""] = noSep.split(",");

	// Add thousand separators "." to integer part
	const intWithDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

	return sign + intWithDots + (hasComma ? "," + fracPart : "");
}

export function NumberField(props: React.ComponentProps<"input">) {
	const [value, setValue] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
		const el = e.currentTarget;
		const raw = el.value;
		const selStart = el.selectionStart ?? raw.length;

		// Strip thousand separators (.)
		const noSep = raw.replace(/\./g, "");

		// Allow transitional states: "", "-", ",", "-,", "123,"
		if (!/^-?\d*(,\d*)?$/.test(noSep)) {
			requestAnimationFrame(() => {
				const i = inputRef.current;
				if (i) i.setSelectionRange(selStart, selStart);
			});
			return;
		}

		if (noSep === "" || noSep === "-" || noSep === "," || noSep === "-,") {
			setValue(raw.replace(/[^\d,.\-]/g, "")); // sanitize
			requestAnimationFrame(() => {
				const i = inputRef.current;
				if (i) i.setSelectionRange(selStart, selStart);
			});
			return;
		}

		// caret index in "noSep" string (exclude thousands separators)
		const dotsLeft = (raw.slice(0, selStart).match(/\./g) || []).length;
		const caretInNoSep = selStart - dotsLeft;

		// Format properly
		const formatted = formatID(noSep);
		setValue(formatted);

		// Restore caret
		requestAnimationFrame(() => {
			const i = inputRef.current;
			if (!i) return;
			let pos = 0;
			let count = 0;
			while (pos < formatted.length && count < caretInNoSep) {
				if (formatted[pos] !== ".") count++;
				pos++;
			}
			i.setSelectionRange(pos, pos);
		});
	}

	return (
		<Input ref={inputRef} value={value} onChange={handleChange} inputMode="decimal" {...props} />
	);
}
