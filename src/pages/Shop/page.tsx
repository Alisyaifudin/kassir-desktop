import { useFetchMethods } from "~/hooks/use-fetch-methods";
import { Async } from "~/components/Async";
import { Tab } from "./_components/Tab";
import { Loader2 } from "lucide-react";
import { useDB } from "~/hooks/use-db";
import { context, Provider } from "./use-context";
import { useContext } from "react";
import { LeftPanel } from "./_components/LeftPanel";
import { RightPanel } from "./_components/RightPanel";

export type Context = {
	toast: (text: string) => void;
};

export default function Page({ toast }: Context) {
	const db = useDB();
	const [state] = useFetchMethods(db);
	return (
		<Async state={state}>
			{(methods) => (
				<Provider methods={methods} toast={toast}>
					<Wrapper />
				</Provider>
			)}
		</Async>
	);
}

function Wrapper() {
	const ctx = useContext(context);
	if (ctx === null) {
		return (
			<main className="flex flex-col min-h-0 max-h-[calc(100vh-83px)] overflow-hidden grow shrink basis-0 relative">
				<Loader2 className="animate-splin" />;
			</main>
		);
	}
	return <Component />;
}

function Component() {
	return (
		<main className="flex flex-col min-h-0 max-h-full overflow-hidden grow shrink basis-0 relative">
			<div className="gap-2 p-2 flex h-full">
				<LeftPanel />
				<RightPanel />
			</div>
			<Tab />
		</main>
	);
}
