import Decimal from "decimal.js";
import { z } from "zod";
import { useDB } from "~/hooks/use-db";
import { useAction } from "~/hooks/useAction";
import { log, numeric } from "~/lib/utils";

export function useDebt(timestamp: number, revalidate: () => void, grandTotal: number) {
	const db = useDB();
	const { error, loading, setError, action } = useAction(
		"",
		(data: { pay: number; rounding: number }) => db.record.update.payCredit(timestamp, data)
	);
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = z
			.object({
				pay: numeric,
				rounding: numeric,
			})
			.safeParse({
				pay: formData.get("pay"),
				rounding: formData.get("round") || "0",
			});
		if (!parsed.success) {
			log.error(JSON.stringify(parsed.error));
			setError(parsed.error.flatten().formErrors.join("; "));
			return;
		}
		const { pay, rounding } = parsed.data;
		const change = new Decimal(pay).sub(rounding).sub(grandTotal).toNumber();
		if (change < 0) {
			setError("Bayaran tidak cukup");
			return;
		}
		const errMsg = await action({
			pay,
			rounding,
		});
		if (errMsg) {
			setError(errMsg);
			return;
		}
		setError("");
		revalidate();
	};
	return { handleSubmit, loading, error };
}
