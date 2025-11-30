import { Item } from "./_components/Item";
import { NewBtn } from "./_components/NewItem";
import { useMethod } from "./_hooks/use-method";
import { TabLink } from "./_components/TabLink";
import { Database } from "~/database";
import { Async } from "~/components/Async";

export default function Page({ db }: { db: Database }) {
	const { method, setMethod, state, revalidate } = useMethod(db);
	return (
		<div className="flex flex-col gap-2 p-5 flex-1 text-3xl overflow-auto">
			<h1 className="text-4xl font-bold">Metode Pembayaran</h1>
			<TabLink method={method} setMethod={setMethod} />
			<Async state={state}>
				{(data) => {
					const methods = data.filter((d) => d.method === method && d.name !== null);
					return (
						<div className="flex flex-col gap-2">
							{methods.map((m) => (
								<Item db={db} revalidate={revalidate} key={m.id} method={m} />
							))}
							<NewBtn method={method} db={db} revalidate={revalidate} />
						</div>
					);
				}}
			</Async>
		</div>
	);
}
