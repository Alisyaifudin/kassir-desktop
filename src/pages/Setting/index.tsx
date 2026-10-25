import type { RouteObject } from "react-router";
import { shopRoute } from "./Shop";
import { dataRoute } from "./Data";
import { profileRoute } from "./Profile";
import { logRoute } from "./Log";
import { printerRoute } from "./Printer";
import Layout from "./layout";
import Page from "./page";

/**
 * The settings section.
 *
 * The shell and the hub are imported eagerly, and that is the point: the hub is a
 * table of contents — section names, five rows, their descriptions and the version
 * — every word of which is static data (`util-nav.ts`), and the two values that
 * are not (`useUser`'s name and `useSize`'s size) are seeded synchronously from
 * the services that already answered at login. Code-splitting it behind a
 * full-page skeleton meant the operator watched a grey outline of a list whose
 * content never had to be fetched.
 *
 * The screens *inside* the section stay lazy: those are forms and consoles whose
 * bodies are the data.
 */
export const settingRoute: RouteObject = {
  path: "setting",
  children: [
    profileRoute,
    shopRoute,
    dataRoute,
    logRoute,
    printerRoute,
    { index: true, Component: Page },
  ],
  Component: Layout,
};
