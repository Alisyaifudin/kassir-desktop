import { useFetchMethods } from "../../hooks/use-fetch-methods";
import { Database } from "~/database";
import { Async } from "~/components/Async";
import { Sheet } from "./_components/Sheet";
import { Tab } from "./_components/Tab";
import { LocalContext, useLocalState } from "./_hooks/use-local-state";
import { Loader2 } from "lucide-react";

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
	const { state, setState, clear } = useLocalState(methods);
	if (state === null) {
		return (
			<main className="flex flex-col min-h-0 max-h-[calc(100vh-83px)] overflow-hidden grow shrink basis-0 relative">
				<Loader2 className="animate-splin" />;
			</main>
		);
	}
	const localContext = { state, setState, clear };
	return <Component methods={methods} localContext={localContext} context={context} />;
}

function Component({
	methods,
	context,
	localContext,
}: {
	methods: DB.Method[];
	localContext: LocalContext;
	context: Context;
}) {
	return (
		<main className="flex flex-col min-h-0 max-h-[calc(100vh-83px)] overflow-hidden grow shrink basis-0 relative">
			<Sheet context={context} localContext={localContext} />
			<Tab methods={methods} context={localContext} />
		</main>
	);
}
