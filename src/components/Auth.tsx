import { useFetchUser } from "../Layout";
import { User } from "../lib/auth";
import { Await } from "./Await";
import Redirect from "./Redirect";

export function Auth({
	children,
	admin = false,
	redirect = "/setting/profile",
}: {
	children: (user: User, update: () => void) => React.ReactNode;
	admin?: boolean;
	redirect?: string;
}) {
	const { state, update } = useFetchUser();
	return (
		<Await state={state}>
			{(user) => {
				if (user === null) {
					return <Redirect to="/" />;
				}
				if (admin && user.role !== "admin") {
					return <Redirect to={redirect} />;
				}
				return children(user, update);
			}}
		</Await>
	);
}
