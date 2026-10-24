import { RouteObject } from "react-router";
import { imageRoute } from "./Image/index.tsx";
import { detailRoute } from "./Info/index.tsx";
import { perfRoute } from "./Performance/index.tsx";
import Page from "./page.tsx";

export const productDetailRoute: RouteObject = {
  Component: Page,
  path: ":id",
  children: [imageRoute, detailRoute, perfRoute],
};
