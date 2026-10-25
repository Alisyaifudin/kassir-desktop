import { RouteObject } from "react-router";
import { moneyHistoryRoute } from "./History";
import Page from "./page";

export const moneyRoute: RouteObject = {
  path: "money",
  children: [{ index: true, Component: Page }, moneyHistoryRoute],
};
