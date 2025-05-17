import { Button } from "~/components/ui/button";
import { useDB } from "~/RootLayout";
import { z } from "zod";
import { Database } from "~/database";
import { useAsync } from "~/hooks/useAsync";
import { useSearchParams } from "react-router";
import { useMemo } from "react";
import { Method, METHOD_NAMES, METHODS } from "~/lib/utils";
import { Await } from "~/components/Await";
import { Item } from "./Item";
import { NewBtn } from "./NewItem";

export default function Profile() {
	const db = useDB();
	const [search, setSearch] = useSearchParams();
	const method = useMemo(() => {
		const method = z.enum(METHODS).catch("transfer").parse(search.get("method"));
		return method;
	}, [search]);
	const setMethod = (method: Method) => setSearch({ method });
	const state = useMethod(db);
	return (
		<div className="flex flex-col gap-2 p-5 flex-1 text-3xl">
			<h1 className="text-4xl font-bold">Metode Pembayaran</h1>
			<ol className="flex items-cente gap-1">
				{METHODS.filter((m) => m !== "cash").map((m) => (
					<li key={m}>
						<Button onClick={() => setMethod(m)} variant={method === m ? "default" : "link"}>
							{METHOD_NAMES[m]}
						</Button>
					</li>
				))}
			</ol>
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

function useMethod(db: Database) {
	const state = useAsync(() => db.method.get(), ["fetch-method"]);
	return state;
}
