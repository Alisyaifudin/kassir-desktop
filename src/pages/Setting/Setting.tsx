import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { useDB, useStore } from "~/RootLayout";
import { Button } from "~/components/ui/button";
import { Update } from "./Update";
import { version } from "~/lib/utils";
import { Loader2, LogOut } from "lucide-react";
import { auth } from "~/lib/auth";
import { TextError } from "~/components/TextError";
import { useUser } from "~/Layout";
import { useAction } from "~/hooks/useAction";

export default function Setting() {
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
	const { pathname } = useLocation();
	const store = useStore();
	const { action, loading, error, setError } = useAction("", async () => {
		return await auth.logout(store);
	});
	const navigate = useNavigate();

	const handleLogout = async () => {
		const errMsg = await action();
		if (errMsg) {
			setError(errMsg);
			return;
		}
		setError("");
		navigate("/login");
	};
	if (role === "user") {
		return (
			<nav className="w-full h-full flex flex-col justify-between">
				<ol className="flex flex-col gap-2 shadow-md">
					<li className="flex items-center">
						<Button className="w-full">Profil</Button>
					</li>
				</ol>
				<div className="flex flex-col gap-1">
					<Button onClick={handleLogout}>
						{loading ? <Loader2 className="animate-splin" /> : null}
						Keluar
						<LogOut size={30} />
					</Button>
					{error ? <TextError>{error}</TextError> : null}
					<p className="text-3xl">Versi {version}</p>
					<Update />
				</div>
			</nav>
		);
	}

	return (
		<nav className="w-full h-full flex flex-col justify-between">
			<ol className="flex flex-col gap-2 shadow-md">
				<li className="flex items-center">
					<Button className="w-full" asChild variant={pathname === "/setting" ? "default" : "link"}>
						<Link to="/setting">Toko</Link>
					</Button>
				</li>
				<li className="flex items-center">
					<Button
						className="w-full"
						asChild
						variant={pathname === "/setting/social" ? "default" : "link"}
					>
						<Link to="/setting/social">Kontak</Link>
					</Button>
				</li>
				<li className="flex items-center">
					<Button
						className="w-full"
						asChild
						variant={pathname === "/setting/data" ? "default" : "link"}
					>
						<Link to="/setting/data">Data</Link>
					</Button>
				</li>
				<li className="flex items-center">
					<Button
						className="w-full"
						asChild
						variant={pathname === "/setting/cashier" ? "default" : "link"}
					>
						<Link to="/setting/cashier">Kasir</Link>
					</Button>
				</li>
				<li className="flex items-center">
					<Button
						className="w-full"
						asChild
						variant={pathname === "/setting/profile" ? "default" : "link"}
					>
						<Link to="/setting/profile">Profil</Link>
					</Button>
				</li>
				<li className="flex items-center">
					<Button
						className="w-full"
						asChild
						variant={pathname === "/setting/money" ? "default" : "link"}
					>
						<Link to="/setting/money">Uang</Link>
					</Button>
				</li>
			</ol>
			<div className="flex flex-col gap-1">
				<Button onClick={handleLogout}>
					{loading ? <Loader2 className="animate-splin" /> : null}
					Keluar
					<LogOut size={30} />
				</Button>
				{error ? <TextError>{error}</TextError> : null}
				<p className="text-3xl">Versi {version}</p>
				<Update />
			</div>
		</nav>
	);
}
