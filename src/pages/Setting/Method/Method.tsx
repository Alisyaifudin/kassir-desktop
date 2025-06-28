import { Await } from "~/components/Await";
import { Item } from "./_components/Item";
import { NewBtn } from "./_components/NewItem";
import { useMethod } from "./_hooks/use-method";
import { TabLink } from "./_components/TabLink";

export default function Profile() {
	const { method, setMethod, state } = useMethod();
	return (
		<div className="flex flex-col gap-2 p-5 flex-1 text-3xl">
			<h1 className="text-4xl font-bold">Metode Pembayaran</h1>
			<TabLink method={method} setMethod={setMethod} />
			<Await state={state}>
				{(data) => {
					const methods = data.filter((d) => d.method === method);
					return (
						<div className="flex flex-col gap-2">
							{methods.map((m) => (
								<Item key={m.id} method={m} />
							))}
							<NewBtn method={method} />
						</div>
					);
				}}
			</Await>
		</div>
	);
}
