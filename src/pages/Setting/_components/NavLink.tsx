import { Link, useLocation } from "react-router";
import { Button } from "~/components/ui/button";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

export function NavLink({ path, children }: { path: string; children: string }) {
	const { pathname } = useLocation();
	const size = useSize();
	return (
		<li className="flex items-center">
			<Button
				style={style[size].text}
				className="w-full"
				asChild
				variant={pathname === path ? "default" : "link"}
			>
				<Link to={path}>{children}</Link>
			</Button>
		</li>
	);
}
