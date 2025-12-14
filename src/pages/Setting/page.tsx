import { Form, Outlet, useLoaderData, useNavigation } from "react-router";
import { Button } from "~/components/ui/button";
import { cn, sizeClass, version } from "~/lib/utils";
import { Loader2, LogOut } from "lucide-react";
import { Show } from "~/components/Show";
import { UserPanel } from "./UserPanel";
import { AdminPanel } from "./AdminPanel";
import { memo } from "react";
import { Loader } from "./loader";
import { grid } from "./style.css";

export default function Page() {
	const { size, role } = useLoaderData<Loader>();
	return (
		<main
			className={cn(
				"grid gap-2 p-2 flex-1 w-full justify-between overflow-hidden",
				grid[size],
				sizeClass[size]
			)}
		>
			<Navigation role={role} />
			<Outlet />
		</main>
	);
}

const Navigation = memo(function ({ role }: { role: DB.Role }) {
	const navigation = useNavigation();
	const loading = navigation.state === "submitting";
	return (
		<nav className="w-full h-full flex py-1 flex-col justify-between overflow-auto">
			<Show when={role === "admin"} fallback={<UserPanel />}>
				<AdminPanel />
			</Show>
			<Form method="POST" className="flex flex-col gap-1">
				<Button type="submit">
					<Show when={loading}>
						<Loader2 className="animate-splin" />
					</Show>
					Keluar
					<LogOut />
				</Button>
				<p>Versi {version}</p>
				{/* <Update /> */}
			</Form>
		</nav>
	);
});
