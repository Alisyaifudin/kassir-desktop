import { Link, Outlet, useLocation } from "react-router";
import { useDb, useStore } from "../../Layout";
import { Button } from "../../components/ui/button";
import { Update } from "./Update";
import { useAsync } from "../../hooks/useAsync";
import { Await } from "../../components/Await";

export default function Setting() {
	const db = useDb();
	const store = useStore();
	const state = useAsync(store.version.get());
	const { pathname } = useLocation();
	return (
		<main className="flex gap-2 p-2 flex-1 w-full max-w-7xl mx-auto justify-between">
			<nav className="w-[200px] h-full flex flex-col justify-between">
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
					<li className="h-14 flex items-center">
						<Button
							className="w-full"
							asChild
							variant={pathname === "/setting/cashier" ? "default" : "link"}
						>
							<Link to="/setting/cashier">Kasir</Link>
						</Button>
					</li>
				</ol>
				<div className="flex flex-col gap-1">
					<Await state={state}>{(data) => <p className="text-3xl">Versi {data ?? "?"}</p>}</Await>
					<Update />
				</div>
			</nav>
			<Outlet context={{ db, store }} />
		</main>
	);
}
