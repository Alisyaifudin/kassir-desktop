import { LoaderArgs } from "~/lib/utils";
import { getUser } from "~/middleware/authenticate";
import { getContext } from "~/middleware/global";

export async function loader({ context }: LoaderArgs) {
	const { store } = getContext(context);
	const user = await getUser(context);
	const size = await store.size();
	return { size, role: user.role };
}

export type Loader = typeof loader;
