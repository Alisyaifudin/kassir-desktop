import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { useDb, useStore } from "../../RootLayout";
import { Button } from "../../components/ui/button";
import { Update } from "./Update";
import { version } from "../../lib/utils";
import { useFetchUser } from "../../Layout";
import { Await } from "../../components/Await";
import Redirect from "../../components/Redirect";
import { Loader2, LogOut } from "lucide-react";
import { auth } from "../../lib/auth";
import { useState } from "react";
import { TextError } from "../../components/TextError";

export default function Setting() {
	const db = useDb();
	const store = useStore();
	const { state: user } = useFetchUser();
	return (
		<main className="flex gap-2 p-2 flex-1 w-full max-w-7xl mx-auto justify-between">
			<Await state={user}>
				{(user) => {
					if (user === null) {
						return <Redirect to="/" />;
					}
					return (
						<>
							<Navigation role={user.role} />
							<Outlet context={{ db, store }} />
						</>
					);
				}}
			</Await>
		</main>
	);
}

function Navigation({ role }: { role: "admin" | "user" }) {
	const { pathname } = useLocation();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const navigate = useNavigate();
	const store = useStore();
	const handleLogout = async () => {
		setLoading(true);
		const errMsg = await auth.logout(store);
		setLoading(false);
		if (errMsg) {
			setError(errMsg);
			return;
		}
		setError("");
		navigate("/");
	};
	if (role === "user") {
		return (
			<nav className="w-[200px] h-full flex flex-col justify-between">
				<ol className="flex flex-col gap-2 p-2 shadow-md">
					<li className="h-14 flex items-center">
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
		<nav className="w-[200px] h-full flex flex-col justify-between">
			<ol className="flex flex-col gap-2 p-2 shadow-md">
				<li className="h-14 flex items-center">
					<Button className="w-full" asChild variant={pathname === "/setting" ? "default" : "link"}>
						<Link to="/setting">Toko</Link>
					</Button>
				</li>
				<li className="h-14 flex items-center">
					<Button
						className="w-full"
						asChild
						variant={pathname === "/setting/data" ? "default" : "link"}
					>
						<Link to="/setting/data">Data</Link>
					</Button>
				</li>
				<li className="h-14 flex items-center">
					<Button
						className="w-full"
						asChild
						variant={pathname === "/setting/cashier" ? "default" : "link"}
					>
						<Link to="/setting/cashier">Kasir</Link>
					</Button>
				</li>
				<li className="h-14 flex items-center">
					<Button
						className="w-full"
						asChild
						variant={pathname === "/setting/profile" ? "default" : "link"}
					>
						<Link to="/setting/profile">Profil</Link>
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
