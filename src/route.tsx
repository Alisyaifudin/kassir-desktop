import { createBrowserRouter } from "react-router";
import Home from "./pages/Home/index.tsx";
import {route as stockRoute} from "./pages/Stock/index.tsx";
import Layout, { loader } from "./Layout.tsx";
import { route as itemRoute } from "./pages/Stock/Items/index.tsx";
import { route as settingRoute } from "./pages/Setting/index.tsx";

export const router = createBrowserRouter([
	{
		path: "/",
		Component: Layout,
		loader,
		children: [
			{ index: true, Component: Home },
			itemRoute,
			stockRoute,
			settingRoute
		],
	},
]);
