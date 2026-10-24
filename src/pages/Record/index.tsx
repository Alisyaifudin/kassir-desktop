import { RouteObject } from "react-router";
import { searchRoute } from "./Search";
import { itemRoute } from "./Item";
import Page from "./page";

export const recordRoute: RouteObject = {
  path: "records",
  children: [{ Component: Page, index: true }, searchRoute, itemRoute],
};
