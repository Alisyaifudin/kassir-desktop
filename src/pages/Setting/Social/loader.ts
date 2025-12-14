import { LoaderArgs } from "~/lib/utils";
import { getContext } from "~/middleware/global";

export async function loader({ context }: LoaderArgs) {
	const { store, db } = getContext(context);
	const socials = db.social.get.all();
	const size = await store.size();
	return { socials, size };
}

export type Loader = typeof loader;
