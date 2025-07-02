import { Link, useLocation } from "react-router";
import { cn } from "~/lib/utils";

export function NavLink({
	path,
	children,
	root = false,
}: {
	path: string;
	children: string;
	root?: boolean;
}) {
	const { pathname } = useLocation();
	return (
		<li
			className={cn(
				"text-3xl rounded-t-lg p-3 font-bold",
				(root ? pathname === path : pathname.includes(path)) ? "bg-white" : "bg-white/50"
			)}
		>
			<Link to={path}>{children}</Link>
		</li>
	);
}
