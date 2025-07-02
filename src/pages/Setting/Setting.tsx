import { Outlet, useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import { Update } from "./_components/Update";
import { version } from "~/lib/utils";
import { Loader2, LogOut } from "lucide-react";
import { useLogout } from "./_hooks/use-logout";
import { Show } from "~/components/Show";
import { UserPanel } from "./_components/UserPanel";
import { AdminPanel } from "./_components/AdminPanel";
import { Either } from "~/components/Either";
import { Database } from "~/database";
import { Store } from "~/lib/store";
import { User } from "~/lib/auth";
import { memo } from "react";

export default function Page({
	context,
	toast,
	notify,
}: {
	context: { db: Database; store: Store; user: User; refetchName: () => void };
	toast: (text: string) => void;
	notify: (notification: React.ReactNode) => void;
}) {
	return (
		<main className="grid grid-cols-[300px_1fr] gap-2 p-2 flex-1 w-full justify-between overflow-hidden">
			<Navigation store={context.store} role={context.user.role} toast={toast} notify={notify} />
			<Outlet context={context} />
		</main>
	);
}

const Navigation = memo(function ({
	role,
	store,
	toast,
	notify,
}: {
	role: "admin" | "user";
	store: Store;
	toast: (text: string) => void;
	notify: (notification: React.ReactNode) => void;
}) {
	const navigate = useNavigate();
	const { handleLogout, loading } = useLogout(store, navigate, toast);
	return (
		<nav className="w-full h-full flex flex-col justify-between">
			<Either if={role === "admin"} then={<AdminPanel />} else={<UserPanel />} />
			<div className="flex flex-col gap-1">
				<Button onClick={handleLogout}>
					<Show when={loading}>
						<Loader2 className="animate-splin" />
					</Show>
					Keluar
					<LogOut size={30} />
				</Button>
				<p className="text-3xl">Versi {version}</p>
				<Update notify={notify} store={store} toast={toast} />
			</div>
		</nav>
	);
});
