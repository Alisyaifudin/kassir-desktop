import { useAsync } from "~/hooks/useAsync";
import { Await } from "~/components/Await";
import { useDB } from "~/RootLayout";
import { TextError } from "~/components/TextError";
import { LoginForm } from "./LoginForm";
import { FreshForm } from "./FreshForm";

export default function Page() {
	const state = useFetchCashiers();
	return (
		<main className="flex flex-1 flex-col justify-center bg-zinc-950">
			<Await state={state} Error={(error) => <TextError>{error}</TextError>}>
				{(cashiers) => {
					if (cashiers.length === 0) {
						return <FreshForm />;
					}
					return <LoginForm cashiers={cashiers} />;
				}}
			</Await>
		</main>
	);
}

function useFetchCashiers() {
	const db = useDB();
	const state = useAsync(() => db.cashier.get());
	return state;
}
