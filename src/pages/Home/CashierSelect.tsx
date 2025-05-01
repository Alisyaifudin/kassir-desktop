import React, { useEffect } from "react";
import { Result } from "../../lib/utils";
import { TextError } from "../../components/TextError";
import { useData } from "./schema";

export function CashierSelect({ data }: { data: Result<"Aplikasi bermasalah", DB.Cashier[]> }) {
	const [errCashiers, cashiers] = data;
	const { changeCashier, cashier } = useData();
	// const { changeCashier, cashier } = useData((state) => ({
	// 	changeCashier: state.changeCashier,
	// 	cashier: state.cashier,
	// }));
	useEffect(() => {
		if (cashiers === null) {
			return;
		}
		if (cashiers.length === 0) {
			return;
		}
		if (cashier === null) {
			changeCashier(cashiers[0].name);
			return;
		}
		const found = cashiers.find((c) => c.name === cashier);
		if (found === undefined) {
			changeCashier(cashiers[0].name);
			return;
		}
	}, []);
	const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		changeCashier(e.currentTarget.value);
	};
	if (errCashiers !== null) {
		return <TextError>{errCashiers}</TextError>;
	}
	if (cashier === null) {
		return null;
	}
	return (
		<div className="flex items-center gap-2">
			<p className="text-3xl">Kasir:</p>
			<select className=" w-[110px] border text-3xl" value={cashier} onChange={handleChange}>
				{cashiers.map((cashier) => (
					<option key={cashier.name} value={cashier.name}>
						{cashier.name}
					</option>
				))}
			</select>
		</div>
	);
}
