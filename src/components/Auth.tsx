import { useStore } from "~/RootLayout";
import { auth, User } from "~/lib/auth";
import { Await } from "./Await";
import Redirect from "./Redirect";
import { useAsync } from "~/hooks/useAsync";

export function Auth({ children }: { children: (user: User) => React.ReactNode }) {
	const state = useFetchUser();
	return (
		<Await state={state}>
			{(user) => {
				if (user === null) {
					return <Redirect to="/login" />;
				}
				return children(user);
			}}
		</Await>
	);
}

const useFetchUser = () => {
	const token = localStorage.getItem("token");
	const store = useStore();
	const state = useAsync(() => auth.validate(store, token ?? ""), ["fetch-user"]);
	return state;
};
