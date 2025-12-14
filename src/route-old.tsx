import { createBrowserRouter } from "react-router";
import { route as loginRoute } from "./pages/login/index.tsx";
import { route as shopRoute } from "./pages/shop/index.tsx";
import { route as stockRoute } from "./pages/stock/index.tsx";
import Layout, { ErrorBoundary } from "./layouts/Layout.tsx";
import { route as settingRoute } from "./pages/setting/index.tsx";
import { route as recordsRoute } from "./pages/Record/index.tsx";
import { route as moneyRoute } from "./pages/money/index.tsx";
import { route as analRoute } from "./pages/analytics/index.tsx";
import RootLayout from "./layouts/RootLayout.tsx";
import { Auth } from "./pages/Login/Auth.tsx";

export const router = createBrowserRouter([
	{
		path: "/",
		Component: RootLayout,
		ErrorBoundary,
		children: [
			loginRoute,
			{
				path: "/",
				Component: () => {
					return <Auth>{(user) => <Layout user={user} />}</Auth>;
				},
				children: [shopRoute, settingRoute, stockRoute, recordsRoute, analRoute, moneyRoute],
			},
		],
	},
]);
