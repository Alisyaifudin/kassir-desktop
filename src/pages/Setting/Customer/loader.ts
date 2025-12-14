import { LoaderArgs } from "~/lib/utils";
import { getContext } from "~/middleware/global";

export async function loader({ context }: LoaderArgs) {
	const { db, store } = getContext(context);
	const customers = db.customer.get.all();
	const size = await store.size();
	return { customers, size };
}

export type Loader = typeof loader;
