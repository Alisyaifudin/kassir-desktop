import { createBrowserRouter } from "react-router";
import { route as sellRoute } from "./pages/Sell";
import { route as buyRoute } from "./pages/Buy";
import { route as stockRoute } from "./pages/Stock";
import Layout, { loader } from "./Layout.tsx";
import { route as itemRoute } from "./pages/Stock/Product/index.tsx";
import { route as settingRoute } from "./pages/Setting";
import { route as recordsRoute } from "./pages/Records";

export const router = createBrowserRouter([
	{
		path: "/",
		Component: Layout,
		loader,
		children: [sellRoute, buyRoute, itemRoute, stockRoute, settingRoute, recordsRoute],
	},
]);
