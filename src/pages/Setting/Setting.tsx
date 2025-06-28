import { Outlet } from "react-router";
import { useDB, useStore } from "~/RootLayout";
import { Button } from "~/components/ui/button";
import { Update } from "./_components/Update";
import { version } from "~/lib/utils";
import { Loader2, LogOut } from "lucide-react";
import { useUser } from "~/Layout";
import { useLogout } from "./_hooks/use-logout";
import { Show } from "~/components/Show";
import { UserPanel } from "./_components/UserPanel";
import { AdminPanel } from "./_components/AdminPanel";
import { Either } from "~/components/Either";

export default function Page() {
	const db = useDB();
	const store = useStore();
	const user = useUser();
	return (
		<main className="grid grid-cols-[300px_1fr] gap-2 p-2 flex-1 w-full justify-between overflow-hidden">
			<Navigation role={user.role} />
			<Outlet context={{ db, store, user }} />
		</main>
	);
}

function Navigation({ role }: { role: "admin" | "user" }) {
	const { handleLogout, loading } = useLogout();
	return (
		<nav className="w-full h-full flex flex-col justify-between">
			<Either if={role === "admin"} then={<UserPanel />} else={<AdminPanel />} />
			<div className="flex flex-col gap-1">
				<Button onClick={handleLogout}>
					<Show when={loading}>
						<Loader2 className="animate-splin" />
					</Show>
					Keluar
					<LogOut size={30} />
				</Button>
				<p className="text-3xl">Versi {version}</p>
				<Update />
			</div>
		</nav>
	);
}
