import { LoaderArgs } from "~/lib/utils";
import { getUser } from "~/middleware/authenticate";
import { getContext } from "~/middleware/global";

export async function loader({ context }: LoaderArgs) {
	const user = await getUser(context);
	const { db, store } = getContext(context);
	const products = db.product.get.all();
	const additionals = db.additionalItem.get.all();
	const size = await store.size();
	return { size, additionals, products, role: user.role };
}

export type Loader = typeof loader;
