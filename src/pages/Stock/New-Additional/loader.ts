import { data } from "react-router";
import { LoaderArgs } from "~/lib/utils";
import { getContext } from "~/middleware/global";

export async function loader({ context }: LoaderArgs) {
	const { store } = getContext(context);
	const size = await store.size();
	return data(size);
}

export type Loader = typeof loader;
