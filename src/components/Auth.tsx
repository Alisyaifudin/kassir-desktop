import { auth, User } from "~/lib/auth";
import Redirect from "./Redirect";
import { Store } from "~/lib/store";
import { useFetch } from "~/hooks/useFetch";
import { Async } from "./Async";
import { useCallback } from "react";
import { TextError } from "./TextError";

export function Auth({
	children,
	store,
}: {
	children: (user: User, revalidate: () => void) => React.ReactNode;
	store: Store;
}) {
	const [state, revalidate] = useAuth(store);
	return (
		<Async state={state} Error={(msg) => <TextError>{msg}</TextError>}>
			{(user) => {
				if (user === null) {
					return <Redirect to="/login" />;
				}
				return children(user, revalidate);
			}}
		</Async>
	);
}

function useAuth(store: Store) {
	const fetch = useCallback(() => auth.decode(store), []);
	return useFetch(fetch);
}
