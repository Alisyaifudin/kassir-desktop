import { createBrowserRouter } from "react-router";
import { route as homeRoute } from "./pages/Home/index.tsx";
import { route as stockRoute } from "./pages/Stock";
import Layout from "./Layout.tsx";
import { route as itemRoute } from "./pages/Stock/Product/index.tsx";
import { route as settingRoute } from "./pages/Setting/index.tsx";
import { route as recordsRoute } from "./pages/Records";

export const router = createBrowserRouter([
	{
		path: "/",
		Component: Layout,
		children: [homeRoute, itemRoute, stockRoute, settingRoute, recordsRoute],
	},
]);
