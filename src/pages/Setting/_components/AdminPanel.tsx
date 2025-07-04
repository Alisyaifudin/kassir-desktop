import { NavLink } from "./NavLink";

export function AdminPanel() {
	return (
		<ol className="flex flex-col gap-2 shadow-md">
			<NavLink path="/setting">Toko</NavLink>
			<NavLink path="/setting/social">Kontak</NavLink>
			<NavLink path="/setting/data">Data</NavLink>
			<NavLink path="/setting/cashier">Kasir</NavLink>
			<NavLink path="/setting/profile">Profil</NavLink>
			<NavLink path="/setting/method">Metode</NavLink>
			<NavLink path="/setting/log">Log</NavLink>
		</ol>
	);
}
