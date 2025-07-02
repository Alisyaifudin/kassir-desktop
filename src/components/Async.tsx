import { AsyncState } from "../hooks/useFetch";
import { log } from "../lib/utils";
type AwaitProps<E, T> = {
	state: AsyncState<E, T>;
	Loading?: React.ReactNode;
	Error?: (error: E) => React.ReactNode;
	children: (data: T, loading: boolean) => React.ReactNode;
};

export function Async<E, T>({
	state: { data: awaited, loading, settled },
	Loading = null,
	Error = () => null,
	children,
}: AwaitProps<E, T>) {
	if (!settled) return Loading;
	const [errMsg, data] = awaited;
	if (errMsg !== null) {
		if (typeof errMsg === "string") {
			log.error(errMsg);
		} else if (typeof errMsg === "object") {
			log.error(JSON.stringify(errMsg));
		} else {
			log.error("Something went wrong + " + String(errMsg));
		}
		return Error(errMsg);
	}
	return <>{children(data!, loading)}</>;
}
