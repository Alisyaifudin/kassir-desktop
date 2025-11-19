import { auth, User } from "~/lib/auth";
import Redirect from "./Redirect";
import { Suspense, use } from "react";
import { TextError } from "./TextError";
import { useStore } from "~/store/store";

export function Auth({ children }: { children: (user: User) => React.ReactNode }) {
	return (
		<Suspense>
			<Wrapper>{(user) => children(user)}</Wrapper>
		</Suspense>
	);
}

function Wrapper({ children }: { children: (user: User) => React.ReactNode }) {
	const store = useStore();
	const [errMsg, user] = use(auth.decode(store));
	if (errMsg) {
		return <TextError>{errMsg}</TextError>;
	}
	if (user === null) {
		return <Redirect to="/login" />;
	}
	return children(user);
}
