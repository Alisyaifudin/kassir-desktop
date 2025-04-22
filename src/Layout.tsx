import { LoaderFunctionArgs, Outlet, useLoaderData } from "react-router";

export function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url);
	const path = url.pathname;
	return { path };
}

const title = {
	"/": "Jual",
	"/stock": "Stok",
	"/stock/new": "New",
} as Record<string, string>;

function Layout() {
	const { path } = useLoaderData<typeof loader>();
	return (
		<>
			<header className="bg-sky-300">
				<nav className="flex p-3 justify-between">
					<p className="text-xl font-bold">{title[path]}</p>
					<ul className="flex gap-5 justify-end underline">
						<li>
							<a href="/">Jual</a>
						</li>
						<li>
							<a href="/stock">Stok</a>
						</li>
					</ul>
				</nav>
			</header>
			<Outlet />
		</>
	);
}

export default Layout;
