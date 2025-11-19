import { isRouteErrorResponse, Outlet, useRouteError } from "react-router";
import { Notification } from "../components/Notification";
import { User } from "../lib/auth";
import { Toaster } from "../components/ui/sonner";
import { NavLink } from "./_components/NavLink";
import { useShop } from "./_hooks/use-shop";
import { SettingLink } from "./_components/SettingLink";
import { Store } from "~/lib/store";
import { Database } from "~/database";
import { Async } from "~/components/Async";
import { useNotification } from "~/hooks/use-notification";
import { Show } from "~/components/Show";
import { RefetchProduct } from "./_components/RefetchProduct";


function Layout({ user, db, store }: { user: User; store: Store; db: Database }) {
	const [state, refetchName] = useShop(store);
	const { notification, notify } = useNotification();
	return (
		<Async state={state}>
			{({ name, size }) => (
				<>
					<header style={localStyle[size].header} className="bg-sky-300 flex">
						<nav className="flex px-3 justify-between w-full items-end">
							<div style={localStyle[size].padBottom}>
								<p style={localStyle[size].title} className="italic">
									{name}
								</p>
							</div>
							<ul style={localStyle[size].ul} className="flex justify-end  items-end">
								<NavLink size={size} path="/" root>
									Toko
								</NavLink>
								<NavLink size={size} path="/stock">
									Stok
								</NavLink>
								<NavLink size={size} path="/records">
									Riwayat
								</NavLink>
								<Show when={user.role === "admin"}>
									<NavLink size={size} path="/analytics">
										Analisis
									</NavLink>
									<NavLink size={size} path="/money">
										Uang
									</NavLink>
								</Show>
								<SettingLink size={size} />
								<RefetchProduct size={size} />
							</ul>
						</nav>
					</header>
					<Outlet context={{ db, store, user, refetchName, notify, size }} />
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

const localStyle = {
	big: {
		title: {
			fontSize: "48px",
			lineHeight: 1,
		},
		padBottom: {
			paddingBottom: "16px",
		},
		header: {
			height: "78px",
		},
		ul: {
			gap: "20px",
		},
	},
	small: {
		padBottom: {
			paddingBottom: "8px",
		},
		title: {
			fontSize: "30px",
			lineHeight: 1.2,
		},
		header: {
			height: "50px",
		},
		ul: {
			gap: "10px",
		},
	},
};