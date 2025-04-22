import { createBrowserRouter } from "react-router";
import Home from "./pages/Home.tsx";
import Stock, { loader as stockLoader } from "./pages/Stock.tsx";
import Layout, { loader } from "./Layout.tsx";
import { route as newItemRouter } from "./pages/NewItem/index.tsx";

export const router = createBrowserRouter([
	{
		path: "/",
		Component: Layout,
		loader,
		children: [
			{ index: true, Component: Home },
			{
				path: "stock",
				children: [{ index: true, loader: stockLoader, Component: Stock }, newItemRouter],
			},
		],
	},
]);
