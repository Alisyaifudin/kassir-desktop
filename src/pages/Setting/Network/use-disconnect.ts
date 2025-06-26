import { useAction } from "~/hooks/useAction";
import { emitter } from "~/lib/event-emitter";
import { Store } from "~/store";

export function useDisconnect(store: Store) {
	const { action, loading, error, setError } = useAction("", async () => {
		return null;
	});
	const handleDisconnect = async () => {
		const errMsg = await action();
		setError(errMsg);
		if (errMsg === null) {
			await store.core.delete("token");
		}
		emitter.emit("fetch-connect");
	};
	return { handleDisconnect, loading, error };
}
