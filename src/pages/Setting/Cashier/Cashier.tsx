import { Await } from "../../../components/Await";
import { useDb } from "../../../Layout";
import { useAsync } from "../../../hooks/useAsync";
import { TextError } from "../../../components/TextError";
import { Item } from "./Item";
import { NewCashier } from "./NewCashier";
import { useState } from "react";

export default function Cashier() {
	const [signal, setSignal] = useState(false);
	const state = useCashier(signal);
	return (
		<div className="flex flex-col gap-2 flex-1">
			<h2 className="text-3xl font-bold">Daftar Kasir</h2>
			<Await state={state}>
				{(data) => {
					const [errMsg, cashiers] = data;
					if (errMsg !== null) {
						return <TextError>{errMsg}</TextError>;
					}
					return cashiers.map((cashier) => (
						<Item
							key={cashier.name}
							cashier={cashier}
							sendSignal={() => setSignal((prev) => !prev)}
						/>
					));
				}}
			</Await>
			<NewCashier sendSignal={() => setSignal((prev) => !prev)} />
		</div>
	);
}

function useCashier(signal: boolean) {
	const db = useDb();
	const state = useAsync(db.cashier.get(), [signal]);
	return state;
}
