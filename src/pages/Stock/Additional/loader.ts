import { redirect } from "react-router";
import { integer, LoaderArgs } from "~/lib/utils";
import { getUser } from "~/middleware/authenticate";
import { getContext } from "~/middleware/global";

export async function loader({ context, params }: LoaderArgs) {
	const parsed = integer.safeParse(params.id);
	if (!parsed.success) {
		throw redirect("/stock?tab=additional");
	}
	const id = parsed.data;
	const user = await getUser(context);
	const { store, db } = getContext(context);
	const size = await store.size();
	const [errMsg, additional] = await db.additionalItem.get.byId(id);
	switch(errMsg) {
		case "Aplikasi bermasalah":
			throw new Error(errMsg)
		case "Tidak ditemukan":
			throw redirect("/stock?tab=additional");
	}
	return { size, additional, role: user.role };
}

export type Loader = typeof loader;
