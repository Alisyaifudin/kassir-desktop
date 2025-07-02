import { TextError } from "~/components/TextError";
import { Item } from "./_components/Item";
import { NewCashier } from "./_components/NewCashier";
import { useCashier } from "./_hooks/use-cashier";
import { Database } from "~/database";
import { User } from "~/lib/auth";
import { Async } from "~/components/Async";

export default function Cashier({ user, db }: { user: User; db: Database }) {
	const [state, revalidate] = useCashier(db);
	return (
		<div className="flex flex-col gap-2 flex-1">
			<h2 className="text-3xl font-bold">Daftar Kasir</h2>
			<Async state={state} Error={(error) => <TextError>{error}</TextError>}>
				{(cashiers) => {
					return cashiers.map((cashier) => (
						<Item
							key={cashier.name}
							cashier={cashier}
							username={user.name}
							db={db}
							revalidate={revalidate}
						/>
					));
				}}
			</Async>
			<NewCashier db={db} revalidate={revalidate} />
		</div>
	);
}
