import { Await } from "../../../components/Await";
import { useDb } from "../../../Layout";
import { useAsync } from "../../../hooks/useAsync";
import { TextError } from "../../../components/TextError";
import { Item } from "./Item";
import { NewCashier } from "./NewCashier";

export default function Cashier() {
	const state = useCashier();
	return (
		<div className="flex flex-col gap-2 flex-1">
			<h2 className="text-3xl font-bold">Daftar Kasir</h2>
			<Await state={state}>
				{(data) => {
					const [errMsg, cashiers] = data;
					if (errMsg !== null) {
						return <TextError>{errMsg}</TextError>;
					}
					return cashiers.map((cashier) => <Item key={cashier.name} cashier={cashier} />);
				}}
			</Await>
			<NewCashier />
		</div>
	);
}

function useCashier() {
	const db = useDb();
	const state = useAsync(db.cashier.get(), []);
	return state;
}
