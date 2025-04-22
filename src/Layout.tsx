import { Link, LoaderFunctionArgs, Outlet, useLoaderData, useOutletContext } from "react-router";
import { Button } from "./components/ui/button";
import Database from "@tauri-apps/plugin-sql";
import { useEffect, useState } from "react";
import { Store } from "@tauri-apps/plugin-store";
import { Settings } from "lucide-react";

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url);
	const path = url.pathname;
	return { path };
}

function getTitle(path: string): string {
	if (path === "/") {
		return "Jual";
	} else if (path.includes("stock") || path.includes("items")) {
		return "Stok";
	}
	return "";
}

function Layout() {
	const { path } = useLoaderData<typeof loader>();
	const [db, setDb] = useState<Database | null>(null);
	const [store, setStore] = useState<Store | null>(null);
	useEffect(() => {
		Store.load("store.json", { autoSave: false }).then((store) => {
			setStore(store);
		});
		Database.load("sqlite:mydatabase.db").then((db) => {
			setDb(db);
		});
	}, []);

	if (db === null || store === null) {
		return null;
	}
	return (
		<>
			<header className="bg-sky-300">
				<nav className="flex p-3 justify-between">
					<p className="text-xl font-bold">{getTitle(path)}</p>
					<ul className="flex gap-5 justify-end">
						<li>
							<Button variant="outline" asChild>
								<Link to="/">Jual</Link>
							</Button>
						</li>
						<li>
							<Button variant="outline" asChild>
								<Link to="/">Beli</Link>
							</Button>
						</li>
						<li>
							<Button variant="outline" asChild>
								<Link to="/stock">Stok</Link>
							</Button>
						</li>
						<li>
							<Button variant="outline" asChild>
								<Link to="/records">Riwayat</Link>
							</Button>
						</li>
						<li>
							<Button asChild size="icon" className="rounded-full">
								<Link to="/setting">
									<Settings />
								</Link>
							</Button>
						</li>
					</ul>
				</nav>
			</header>
			<Outlet context={{ db, store }} />
		</>
	);
}

export const useDb = () => {
	const { db } = useOutletContext<{ db: Database }>();
	return db;
};

export const useStore = () => {
	const { store } = useOutletContext<{ store: Store }>();
	return store;
};

export default Layout;
