import { Link, useLocation } from "react-router";
import { Button } from "~/components/ui/button";

export function NavLink({ path, children }: { path: string; children: string }) {
	const { pathname } = useLocation();
	return (
		<li className="flex items-center">
			<Button className="w-full" asChild variant={pathname === path ? "default" : "link"}>
				<Link to={path}>{children}</Link>
			</Button>
		</li>
	);
}
