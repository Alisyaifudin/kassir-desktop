import { isRouteErrorResponse, Outlet, useRouteError } from "react-router";
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
import { Show } from "~/components/Show";
import { RefetchProduct } from "./_components/RefetchProduct";

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
						<Show when={user.role === "admin"}>
							<NavLink path="/analytics">Analisis</NavLink>
							<NavLink path="/money">Uang</NavLink>
						</Show>
						<SettingLink />
						<RefetchProduct  />
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

export function ErrorBoundary() {
	const error = useRouteError();
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