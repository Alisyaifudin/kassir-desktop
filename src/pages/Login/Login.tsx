import { TextError } from "~/components/TextError";
import { LoginForm } from "./_components/LoginForm";
import { FreshForm } from "./_components/FreshForm";
import { useFetchCashiers } from "./_hooks/use-fetch-cashier";
import { Database } from "~/database";
import { Async } from "~/components/Async";
import { Store } from "~/lib/store";

export default function Page({ context }: { context: { db: Database; store: Store } }) {
	const state = useFetchCashiers({ db: context.db });
	return (
		<main className="flex flex-1 flex-col justify-center bg-zinc-950">
			<Async state={state} Error={(error) => <TextError>{error}</TextError>}>
				{(cashiers) => {
					if (cashiers.length === 0) {
						return <FreshForm context={context} />;
					}
					return <LoginForm cashiers={cashiers} context={context} />;
				}}
			</Async>
		</main>
	);
}
