import {
	Link,
	Outlet,
	useLocation,
	useOutletContext,
} from "react-router";
import { Button } from "./components/ui/button";
import DatabaseTauri from "@tauri-apps/plugin-sql";
import { useEffect, useState } from "react";
import { Store as StoreTauri } from "@tauri-apps/plugin-store";
import { Settings } from "lucide-react";
import { type Database, generateDB } from "./database";
import { generateStore, Store } from "./store";

function getTitle(path: string): string {
	if (path === "/") {
		return "Toko";
	} else if (path === "/buy") {
		return "Beli";
	} else if (path === "/setting") {
		return "Pengaturan";
	} else if (path.includes("records")) {
		return "Riwayat";
	} else if (path.includes("stock") || path.includes("items")) {
		return "Stok";
	}
	return "";
}

function Layout() {
	const { pathname } = useLocation();
	// const { path } = useLoaderData<typeof loader>();

	const [db, setDb] = useState<Database | null>(null);
	const [store, setStore] = useState<Store | null>(null);
	useEffect(() => {
		StoreTauri.load("store.json", { autoSave: false }).then((store) => {
			setStore(generateStore(store));
		});
		DatabaseTauri.load("sqlite:data.db").then((db) => {
			setDb(generateDB(db));
		});
	}, []);

	if (db === null || store === null) {
		return null;
	}
	return (
		<>
			<header className="bg-sky-300">
				<nav className="flex p-3 justify-between">
					<p className="text-xl font-bold">{getTitle(pathname)}</p>
					<ul className="flex gap-5 justify-end">
						<li>
							<Button variant="outline" asChild>
								{/* <a href="/">Toko</a> */}
								<Link to="/">Toko</Link>
							</Button>
						</li>
						<li>
							<Button variant="outline" asChild>
								{/* <a href="/stock">Stok</a> */}
								<Link to="/stock">Stok</Link>
							</Button>
						</li>
						<li>
							<Button variant="outline" asChild>
								{/* <a href="/records">Riwayat</a> */}
								<Link to="/records">Riwayat</Link>
							</Button>
						</li>
						<li>
							<Button asChild size="icon" className="rounded-full">
								{/* <a href="/setting">
									<Settings />
								</a> */}
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
