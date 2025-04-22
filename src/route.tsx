import { createBrowserRouter } from "react-router";
import Home from "./pages/Home/index.tsx";
import Stock, { loader as stockLoader } from "./pages/Stock/index.tsx";
import Layout, { loader } from "./Layout.tsx";
import { route as newItemRouter } from "./pages/Stock/NewItem/index.tsx";
import { route as itemRouter } from "./pages/Stock/Items/index.tsx";

export const router = createBrowserRouter([
	{
		path: "/",
		Component: Layout,
		loader,
		children: [
			{ index: true, Component: Home },
			itemRouter,
			{
				path: "stock",
				children: [{ index: true, loader: stockLoader, Component: Stock }, newItemRouter],
			},
		],
	},
]);
