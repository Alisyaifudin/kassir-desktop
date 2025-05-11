import { Await } from "~/components/Await";
import { useDB } from "~/RootLayout";
import { useAsync } from "~/hooks/useAsync";
import { TextError } from "~/components/TextError";
import { Item } from "./Item";
import { NewCashier } from "./NewCashier";
import { useUser } from "~/Layout";

export default function Cashier() {
	const user = useUser();
	const state = useCashier();
	return (
		<div className="flex flex-col gap-2 flex-1">
			<h2 className="text-3xl font-bold">Daftar Kasir</h2>
			<Await state={state} Error={(error) => <TextError>{error}</TextError>}>
				{(cashiers) => {
					return cashiers.map((cashier) => (
						<Item key={cashier.name} cashier={cashier} username={user.name} />
					));
				}}
			</Await>
			<NewCashier />
		</div>
	);
}

function useCashier() {
	const db = useDB();
	const state = useAsync(() => db.cashier.get(), ["fetch-cashiers"]);
	return state;
}
