import { Link, useLocation } from "react-router";
import { Button } from "~/components/ui/button";

export function AdminPanel() {
	return (
		<ol className="flex flex-col gap-2 shadow-md">
			<NavLink path="/setting/shop">Toko</NavLink>
			<NavLink path="/setting">Profil</NavLink>
			<NavLink path="/setting/social">Kontak</NavLink>
			<NavLink path="/setting/data">Data</NavLink>
			<NavLink path="/setting/cashier">Kasir</NavLink>
			<NavLink path="/setting/method">Metode</NavLink>
			<NavLink path="/setting/customer">Pelanggan</NavLink>
			<NavLink path="/setting/log">Log</NavLink>
		</ol>
	);
}

function NavLink({ path, children }: { path: string; children: string }) {
	const { pathname } = useLocation();
	return (
		<li className="flex items-center">
			<Button className="w-full" asChild variant={pathname === path ? "default" : "link"}>
				<Link to={path}>{children}</Link>
			</Button>
		</li>
	);
}
