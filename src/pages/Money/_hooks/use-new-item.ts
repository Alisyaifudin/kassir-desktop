import { SetURLSearchParams } from "react-router";
import { Temporal } from "temporal-polyfill";
import { Database } from "~/database";
import { useAction } from "~/hooks/useAction";
import { numeric } from "~/lib/utils";

export function useNewItem(
	kind: "saving" | "debt" | "diff",
	setOpen: (open: boolean) => void,
	setSearch: SetURLSearchParams,
	revalidate: () => void,
	db: Database
) {
	const { loading, error, setError, action } = useAction(
		"",
		({ value, type }: { type: "change" | "abs"; value: number }) =>
			type === "abs" ? db.money.add.abs(value, kind) : db.money.add.change(value, kind)
	);
	const handleSubmitAbs = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = numeric.safeParse(formData.get("value"));
		if (!parsed.success) {
			const errs = parsed.error.flatten().formErrors;
			setError(errs.join(";"));
			return;
		}
		if (parsed.data < 0 && kind !== "diff") {
			setError("Nilai tidak boleh kurang dari nol");
			return;
		}
		if (parsed.data > 1e12) {
			setError("Nilai tidak mungkin lebih dari 1 triliun. Serius?");
			return;
		}
		const errMsg = await action({ value: parsed.data, type: "abs" });
		setError(errMsg);
		if (errMsg === null) {
			const now = Temporal.Now.instant().epochMilliseconds;
			setSearch({ time: now.toString(), kind });
			setOpen(false);
			revalidate();
		}
	};
	const handleSubmitChange = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = numeric.safeParse(formData.get("value"));
		if (!parsed.success) {
			const errs = parsed.error.flatten().formErrors;
			setError(errs.join(";"));
			return;
		}
		if (parsed.data < -1e12) {
			setError("Nilai tidak mungkin kurang dari -1 triliun. Serius?");
			return;
		}
		if (parsed.data > 1e12) {
			setError("Nilai tidak mungkin lebih dari 1 triliun. Serius?");
			return;
		}
		const errMsg = await action({ value: parsed.data, type: "change" });
		setError(errMsg);
		if (errMsg === null) {
			const now = Temporal.Now.instant().epochMilliseconds;
			setSearch({ time: now.toString(), kind });
			setOpen(false);
			revalidate();
		}
	};
	return { handleSubmitAbs, handleSubmitChange, loading, error };
}
