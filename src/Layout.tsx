import { Link, Outlet, useLocation, useOutletContext } from "react-router";
import DatabaseTauri from "@tauri-apps/plugin-sql";
import { useEffect, useState } from "react";
import { Store as StoreTauri } from "@tauri-apps/plugin-store";
import { Loader2, Settings, BellRing } from "lucide-react";
import { type Database, generateDB } from "./database";
import { generateStore, Store } from "./store";
import { Notification } from "./components/Notification";
import { cn } from "./lib/utils";
import { emitter } from "./lib/event-emitter";
import { check } from "@tauri-apps/plugin-updater";

function Layout() {
	const { pathname } = useLocation();
	const [db, setDb] = useState<Database | null>(null);
	const [store, setStore] = useState<Store | null>(null);
	const [hasUpdate, setHasUpdate] = useState(false);
	const [name, setName] = useState("");
	useEffect(() => {
		StoreTauri.load("store.json", { autoSave: false }).then((store) => {
			const s = generateStore(store);
			setStore(s);
			s.owner.get().then((v) => {
				if (v) {
					setName(v);
				}
			});
			check().then((update) => {
				if (update !== null) {
					s.newVersion.set("true");
					setHasUpdate(true);
				} else {
					s.newVersion.set("false");
				}
			});
		});
		DatabaseTauri.load("sqlite:data.db").then((db) => {
			setDb(generateDB(db));
		});
	}, []);
	useEffect(() => {
		const refreshData = () => {
			if (!store) return;
			store.owner.get().then((ownerName) => setName(ownerName ?? ""));
		};
		emitter.on("refresh", refreshData);
		return () => {
			emitter.off("refresh", refreshData);
		};
	}, [store]);

	return (
		<>
			<header className="bg-sky-300 h-[78px] flex">
				<nav className="flex px-3 pt-5 justify-between w-full items-end">
					<div className="pb-4">
						<p className="text-5xl italic">{name}</p>
					</div>
					<ul className="flex gap-5 justify-end  items-end">
						<li
							className={cn(
								"text-3xl rounded-t-lg p-3 font-bold",
								pathname === "/" ? "bg-white" : "bg-white/50"
							)}
						>
							<Link to="/">Toko</Link>
						</li>
						<li
							className={cn(
								"text-3xl rounded-t-lg p-3 font-bold",
								pathname.includes("/stock") ? "bg-white" : "bg-white/50"
							)}
						>
							<Link to="/stock">Stok</Link>
						</li>
						<li
							className={cn(
								"text-3xl rounded-t-lg p-3 font-bold",
								pathname.includes("/records") ? "bg-white" : "bg-white/50"
							)}
						>
							<Link to="/records">Riwayat</Link>
						</li>
						<li
							className={cn(
								"rounded-t-full h-[60px] flex items-center p-5",
								pathname.includes("/setting") ? "bg-white" : "bg-black text-white"
							)}
						>
							<Link to="/setting" className="relative">
								<Settings size={35} />
								{hasUpdate ? (
									<BellRing className="text-red-500 animate-ring absolute -top-3 -right-3" />
								) : null}
							</Link>
						</li>
					</ul>
				</nav>
			</header>
			<App db={db} store={store} />
			<Notification />
		</>
	);
}

function App({ db, store }: { store: Store | null; db: Database | null }) {
	if (db === null || store === null) {
		return (
			<main className="flex justify-center items-center flex-1">
				<Loader2 className="animate-spin" />
			</main>
		);
	}
	return <Outlet context={{ db, store }} />;
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
