import { isRouteErrorResponse, Outlet, useRouteError } from "react-router";
import { Notification } from "../components/Notification";
import { User } from "../lib/auth";
import { Toaster } from "../components/ui/sonner";
import { NavLink } from "./_components/NavLink";
import { useStoreInfo } from "./_hooks/use-store-info";
import { SettingLink } from "./_components/SettingLink";
import { Async } from "~/components/Async";
import { useNotification } from "~/hooks/use-notification";
import { Show } from "~/components/Show";
import { RefetchProduct } from "./_components/RefetchProduct";
import { useStore } from "~/store/store";

function Layout({ user }: { user: User }) {
	const store = useStore();
	const [state, refetchName] = useStoreInfo(store);
	const { notification, notify } = useNotification();
	return (
		<Async state={state}>
			{(shop) => (
				<>
					<header className="bg-sky-300 h-[78px] flex">
						<nav className="flex px-3 pt-5 justify-between w-full items-end">
							<div className="pb-4">
								<p className="text-5xl italic">{shop.owner}</p>
							</div>
							<ul className="flex gap-5 justify-end  items-end">
								<NavLink path="/" root>
									Toko
								</NavLink>
								<NavLink path="/stock">Stok</NavLink>
								<NavLink path="/records">Riwayat</NavLink>
								<Show when={user.role === "admin"}>
									<NavLink path="/analytics">Analisis</NavLink>
									<NavLink path="/money">Uang</NavLink>
								</Show>
								<SettingLink />
								<RefetchProduct />
							</ul>
						</nav>
					</header>
					<Outlet context={{ refetchName, notify }} />
					<Notification>{notification}</Notification>
					<Toaster />
				</>
			)}
		</Async>
	);
}

export default Layout;

export function ErrorBoundary() {
	const env = import.meta.env.DEV;
	const error = useRouteError();
	if (!env) {
		return (
			<main>
				<p>Halaman bermasalah</p>
				<p>
					Kembali ke <a href="/">halaman utama</a>
				</p>
			</main>
		);
	}
	if (isRouteErrorResponse(error)) {
		return (
			<>
				<h1>
					{error.status} {error.statusText}
				</h1>
				<p>{error.data}</p>
			</>
		);
	} else if (error instanceof Error) {
		return (
			<div>
				<h1>Error</h1>
				<p>{error.message}</p>
				<p>The stack trace is:</p>
				<pre>{error.stack}</pre>
			</div>
		);
	} else {
		return <h1>Unknown Error</h1>;
	}
}
