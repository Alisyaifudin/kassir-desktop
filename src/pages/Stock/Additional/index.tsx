import { LoaderFunctionArgs, redirect, RouteObject, useLoaderData } from "react-router";
import { lazy } from "react";
import { numeric } from "~/lib/utils.ts";
import { useDB } from "~/hooks/use-db.ts";
import { useUser } from "~/hooks/use-user.ts";

const Page = lazy(() => import("./Addditional.tsx"));

export const route: RouteObject = {
	Component: () => {
		const { id } = useLoaderData<typeof loader>();
		const db = useDB();
		const user = useUser();
		return <Page user={user} db={db} id={id} />;
	},
	loader,
	path: "additional/:id",
};

export async function loader({ params }: LoaderFunctionArgs) {
	const parsed = numeric.safeParse(params.id);
	if (!parsed.success) {
		return redirect("/stock");
	}
	return { id: parsed.data };
}
