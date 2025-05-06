import { createBrowserRouter } from "react-router";
import { route as homeRoute } from "./pages/Home";
import { route as shopRoute } from "./pages/Shop";
import { route as stockRoute } from "./pages/Stock";
import Layout from "./Layout.tsx";
import { route as itemRoute } from "./pages/Stock/Product";
import { route as settingRoute } from "./pages/Setting";
import { route as recordsRoute } from "./pages/Records";
import RootLayout from "./RootLayout.tsx";

export const router = createBrowserRouter([
	{
		path: "/",
		Component: RootLayout,
		children: [
			homeRoute,
			{
				path: "/",
				Component: Layout,
				children: [shopRoute, itemRoute, stockRoute, settingRoute, recordsRoute],
			},
		],
	},
]);
