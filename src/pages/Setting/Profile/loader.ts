import { LoaderArgs } from "~/lib/utils";
import { getUser } from "~/middleware/authenticate";
import { getContext } from "~/middleware/global";

export async function loader({ context }: LoaderArgs) {
	const user = await getUser(context);
	const { store } = getContext(context);
	const size = await store.size();
	return { size, name: user.name };
}

export type Loader = typeof loader;
