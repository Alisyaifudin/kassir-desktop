import { Outlet } from "react-router";
import { Notification } from "../components/Notification";
import { User } from "../lib/auth";
import { Toaster } from "../components/ui/sonner";
import { NavLink } from "./_components/NavLink";
import { useShopName } from "./_hooks/use-shop-name";
import { SettingLink } from "./_components/SettingLink";
import { Store } from "~/lib/store";
import { Database } from "~/database";
import { Async } from "~/components/Async";
import { useNotification } from "~/hooks/use-notification";

function Layout({ user, db, store }: { user: User; store: Store; db: Database }) {
	const [state, refetchName] = useShopName(store);
	const { notification, notify } = useNotification();
	return (
		<>
			<header className="bg-sky-300 h-[78px] flex">
				<nav className="flex px-3 pt-5 justify-between w-full items-end">
					<div className="pb-4">
						<Async state={state}>{(name) => <p className="text-5xl italic">{name}</p>}</Async>
					</div>
					<ul className="flex gap-5 justify-end  items-end">
						<NavLink path="/" root>
							Toko
						</NavLink>
						<NavLink path="/stock">Stok</NavLink>
						<NavLink path="/records">Riwayat</NavLink>
						<NavLink path="/analytics">Analisis</NavLink>
						<NavLink path="/money">Uang</NavLink>
						<SettingLink />
						{/* <li className="h-[60px] flex items-center">
							<Await
								state={connection}
								Loading={
									<Button size="icon" variant="outline" className="rounded-full">
										<Loader className="animate-ping" />
									</Button>
								}
							>
								{(connected) => <DownloadBtn connected={connected} />}
							</Await>
						</li> */}
					</ul>
				</nav>
			</header>
			<Outlet context={{ db, store, user, refetchName, notify }} />
			<Notification>{notification}</Notification>
			<Toaster />
		</>
	);
}

export default Layout;
