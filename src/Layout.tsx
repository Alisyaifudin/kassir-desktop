import { Link, Outlet, useLocation, useOutletContext } from "react-router";
import { useEffect, useState } from "react";
import { Settings, BellRing } from "lucide-react";
import { Notification } from "./components/Notification";
import { cn } from "./lib/utils";
import { emitter } from "./lib/event-emitter";
import { check } from "@tauri-apps/plugin-updater";
import { useDB, useStore } from "./RootLayout";
import { User } from "./lib/auth";

function Layout({ user }: { user: User }) {
	const { pathname } = useLocation();
	const [hasUpdate, setHasUpdate] = useState(false);
	const store = useStore();
	const profile = store.profile;
	const db = useDB();
	const [name, setName] = useState("");
	// check for update on mount
	useEffect(() => {
		profile.owner.get().then((v) => {
			if (v) {
				setName(v);
			}
		});
		check().then((update) => {
			if (update !== null) {
				profile.newVersion.set("true");
				setHasUpdate(true);
			} else {
				profile.newVersion.set("false");
			}
		});
	}, []);
	// listener to store name update
	useEffect(() => {
		const refreshData = () => {
			if (!profile) return;
			profile.owner.get().then((ownerName) => setName(ownerName ?? ""));
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
								"text-3xl rounded-t-lg p-3 font-bold",
								pathname.includes("/analytics") ? "bg-white" : "bg-white/50"
							)}
						>
							<Link to="/analytics">Analisis</Link>
						</li>
						<li
							className={cn(
								"text-3xl rounded-t-lg p-3 font-bold",
								pathname.includes("/money") ? "bg-white" : "bg-white/50"
							)}
						>
							<Link to="/money">Uang</Link>
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
			<Outlet context={{ db, store, user }} />
			<Notification />
		</>
	);
}

export default Layout;

export const useUser = () => {
	const { user } = useOutletContext<{ user: User }>();
	return user;
};
