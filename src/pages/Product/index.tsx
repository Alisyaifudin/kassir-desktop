import { RouteObject } from "react-router";
import { newProductRoute } from "./New/index.tsx";
import { productDetailRoute } from "./Detail/index.tsx";
import Page from "./page.tsx";

export const productRoute: RouteObject = {
  path: "products",
  children: [{ index: true, Component: Page }, newProductRoute, productDetailRoute],
};
