import { RouteObject } from "react-router";
import { route as shopRoute } from "./shop";
import { route as dataRoute } from "./data";
// import { route as cashierRoute } from "./cashier";
import { route as profileRoute } from "./profile";
import { route as socialRoute } from "./social";
// import { route as methodRoute } from "./method";
// import { route as logRoute } from "./log";
// import { route as customerRouter } from "./customer";
import { lazy } from "react";
import { action } from "./action";

const Page = lazy(() => import("./page"));

export const route: RouteObject = {
  path: "setting",
  children: [
    profileRoute,
    shopRoute,
    socialRoute,
    dataRoute,
    // cashierRoute,
    // methodRoute,
    // logRoute,
    // customerRouter,
  ],
  Component: Page,
  action,
};
