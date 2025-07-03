import { createBrowserRouter } from "react-router";
import { route as loginRoute } from "./pages/login";
import { route as shopRoute } from "./pages/shop";
import { route as stockRoute } from "./pages/stock";
import Layout from "./layouts/Layout.tsx";
import { route as settingRoute } from "./pages/setting";
import { route as recordsRoute } from "./pages/Record/index.tsx";
import { route as moneyRoute } from "./pages/money";
import { route as analRoute } from "./pages/analytics";
import RootLayout from "./layouts/RootLayout.tsx";
import { Auth } from "./components/Auth.tsx";
import { useStore } from "./hooks/use-store.ts";
import { useDB } from "./hooks/use-db.ts";

export const router = createBrowserRouter([
	{
		path: "/",
		Component: () => {
			return <RootLayout storePath="store.json" dbPath="sqlite:data.db" />;
		},
		children: [
			loginRoute,
			{
				path: "/",
				Component: () => {
					const store = useStore();
					const db = useDB();
					return (
						<Auth store={store}>{(user) => <Layout user={user} db={db} store={store} />}</Auth>
					);
				},
				children: [
					shopRoute,
					settingRoute,
					stockRoute,
					recordsRoute,
					analRoute,
					moneyRoute,
				],
			},
		],
	},
]);
