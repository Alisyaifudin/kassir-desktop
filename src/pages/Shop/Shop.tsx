import { useFetchMethods } from "../../hooks/use-fetch-methods";
import { Database } from "~/database";
import { Async } from "~/components/Async";
import { Sheet } from "./_components/Sheet";
import { Tab } from "./_components/Tab";

export type Context = {
	db: Database;
	toast: (text: string) => void;
};

export default function Page({ db, toast }: Context) {
	const [state] = useFetchMethods(db);
	return (
		<Async state={state}>
			{(methods) => <Wrapper methods={methods} context={{ db, toast }} />}
		</Async>
	);
}

function Wrapper({ methods, context }: { methods: DB.Method[]; context: Context }) {
	return (
		<main className="flex flex-col min-h-0 grow shrink basis-0 relative">
			<Sheet methods={methods} context={context} />
			<Tab />
		</main>
	);
}
