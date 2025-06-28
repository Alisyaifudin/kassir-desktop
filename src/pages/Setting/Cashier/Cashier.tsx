import { Await } from "~/components/Await";
import { TextError } from "~/components/TextError";
import { Item } from "./_components/Item";
import { NewCashier } from "./_components/NewCashier";
import { useUser } from "~/Layout";
import { useCashier } from "./_hooks/use-cashier";

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
