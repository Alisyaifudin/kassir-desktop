import { LoaderArgs } from "~/lib/utils";
import { getContext } from "~/middleware/global";

export async function loader({ context }: LoaderArgs) {
	const { db, store } = getContext(context);
	const methods = db.method.get.all();
	const size = await store.size();
	return { methods, size };
}

export type Loader = typeof loader;
