import React, { useEffect } from "react";
import { Result } from "../../../lib/utils";
import { TextError } from "../../../components/TextError";
import { useStore } from "../../../Layout";

export function CashierSelect({
	data,
	cashier,
	setCashier,
}: {
	data: [Result<"Aplikasi bermasalah", DB.Cashier[]>, string | undefined];
	cashier: string | null;
	setCashier: React.Dispatch<React.SetStateAction<string | null>>;
}) {
	const store = useStore();
	const [[errCashiers, cashiers], rawSelected] = data;
	if (errCashiers !== null) {
		return <TextError>{errCashiers}</TextError>;
	}
	useEffect(() => {
		if (cashiers.length === 0) {
			return;
		}
		if (rawSelected === undefined) {
			setCashier(cashiers[0].name);
			store.cashier.set(cashiers[0].name);
			return;
		}
		const found = cashiers.find((c) => c.name === rawSelected);
		if (found === undefined) {
			setCashier(cashiers[0].name);
			store.cashier.set(cashiers[0].name);
			return;
		}
		setCashier(rawSelected);
		store.cashier.set(rawSelected);
	}, []);
	if (cashier === null) {
		return null;
	}
	const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setCashier(e.currentTarget.value);
		store.cashier.set(e.currentTarget.value);
	};
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
