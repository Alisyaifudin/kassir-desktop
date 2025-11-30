import { Link, useLocation } from "react-router";
import { Size } from "~/hooks/use-size";
import { style } from "~/lib/style";
import { cn } from "~/lib/utils";

export function NavLink({
	path,
	children,
	root = false,
	size,
}: {
	path: string;
	children: string;
	root?: boolean;
	size: Size;
}) {
	const { pathname } = useLocation();
	return (
		<li
			style={style[size].text}
			className={cn(
				"rounded-t-lg p-3 font-bold",
				(root ? pathname === path : pathname.includes(path)) ? "bg-white" : "bg-white/50"
			)}
		>
			<Link to={path}>{children}</Link>
		</li>
	);
}
