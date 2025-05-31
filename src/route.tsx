import { createBrowserRouter } from "react-router";
import { route as loginRoute } from "./pages/Login";
import { route as shopRoute } from "./pages/Shop";
import { route as stockRoute } from "./pages/Stock";
import Layout from "./Layout.tsx";
import { route as settingRoute } from "./pages/Setting";
import { route as recordsRoute } from "./pages/Records";
import { route as moneyRoute } from "./pages/Money";
import { route as analRoute } from "./pages/Analytics";
import RootLayout from "./RootLayout.tsx";
import { Auth } from "./components/Auth.tsx";

export const router = createBrowserRouter([
	{
		path: "/",
		Component: RootLayout,
		children: [
			loginRoute,
			{
				path: "/",
				Component: () => <Auth>{(user) => <Layout user={user} />}</Auth>,
				children: [shopRoute, settingRoute, stockRoute, recordsRoute, analRoute, moneyRoute],
			},
		],
	},
]);
