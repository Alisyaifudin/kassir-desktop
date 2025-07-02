import { type LoaderFunctionArgs, redirect, type RouteObject, useLoaderData } from "react-router";
import { lazy } from "react";
import { numeric } from "~/lib/utils";
import { useDB } from "~/hooks/use-db";
import { useStore } from "~/hooks/use-store";
import { useUser } from "~/hooks/use-user";
import { User } from "~/lib/auth";
import { Store } from "~/lib/store";
import { Database } from "~/database";

const Page = lazy(() => import("./Record-Item"));

export type Context = { db: Database; store: Store; user: User };

export const route: RouteObject = {
	path: ":timestamp",
	Component: () => {
		const { timestamp } = useLoaderData<typeof loader>();
		const db = useDB();
		const store = useStore();
		const user = useUser();
		return <Page timestamp={timestamp} context={{ db, store, user }} />;
	},
	loader,
};

export function loader({ params }: LoaderFunctionArgs) {
	const parsed = numeric.safeParse(params.timestamp);
	if (!parsed.success) {
		return redirect("/records");
	}
	return { timestamp: parsed.data };
}
