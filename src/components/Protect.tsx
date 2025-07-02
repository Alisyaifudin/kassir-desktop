import Redirect from "./Redirect";

export function Protect({ redirect, role, children }: { redirect: string; role: DB.Role, children: React.ReactNode }) {
	if (role !== "admin") {
		return <Redirect to={redirect} />;
	}
	return children;
}
