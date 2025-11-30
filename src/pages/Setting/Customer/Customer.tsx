import { TextError } from "~/components/TextError";
import { Item } from "./_components/Item";
import { NewCustomer } from "./_components/NewCustomer";
import { useCustomer } from "./_hooks/use-customer";
import { Database } from "~/database";
import { Async } from "~/components/Async";

export default function Customer({ db }: { db: Database }) {
	const [state, revalidate] = useCustomer(db);
	return (
		<div className="flex flex-col gap-2 flex-1 overflow-auto">
			<h2 className="text-3xl font-bold">Daftar Pelanggan</h2>
			<Async state={state} Error={(error) => <TextError>{error}</TextError>}>
				{(customers) => {
					return customers.map((customer) => (
						<Item key={customer.name} customer={customer} db={db} revalidate={revalidate} />
					));
				}}
			</Async>
			<NewCustomer db={db} revalidate={revalidate} />
		</div>
	);
}
