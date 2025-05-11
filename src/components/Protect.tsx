import { useUser } from "~/Layout";
import Redirect from "./Redirect";

export function Protect({ redirect, children }: { redirect: string; children: React.ReactNode }) {
	const user = useUser();
	if (user.role !== "admin") {
		return <Redirect to={redirect} />;
	}
	return children;
}
