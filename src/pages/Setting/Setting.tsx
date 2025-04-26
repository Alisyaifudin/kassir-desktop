import { Link, Outlet, useLocation } from "react-router";
import { useDb, useStore } from "../../Layout";
import { Button } from "../../components/ui/button";

export default function Setting() {
	const db = useDb();
	const store = useStore();
	const { pathname } = useLocation();
	return (
		<main className="flex gap-2 p-2 flex-1 w-full max-w-7xl mx-auto justify-between">
			<nav className="w-[200px]">
				<ol className="flex flex-col gap-2 p-2 shadow-md">
					<li className="h-14 flex items-center">
						<Button
							className="w-full"
							asChild
							variant={pathname === "/setting" ? "default" : "link"}
						>
							<Link to="/setting">Profil</Link>
						</Button>
					</li>
					<li className="h-14 flex items-center">
						<Button
							className="w-full"
							asChild
							variant={pathname === "/setting/data" ? "default" : "link"}
						>
							<Link to="/setting/data">Data</Link>
						</Button>
					</li>
				</ol>
			</nav>
			<Outlet context={{ db, store }} />
		</main>
	);
}
