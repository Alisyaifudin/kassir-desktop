import { LoaderArgs } from "~/lib/utils";
import { getUser } from "~/middleware/authenticate";
import { getContext } from "~/middleware/global";

export async function loader({ context }: LoaderArgs) {
	const { db, store } = getContext(context);
	const cashiers = db.cashier.get.all();
	const user = await getUser(context);
	const size = await store.size();
	return { user, cashiers, size };
}

export type Loader = typeof loader;
