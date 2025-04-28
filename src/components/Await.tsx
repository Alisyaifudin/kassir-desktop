import { AsyncState } from "../hooks/useAsync";
import { log } from "../utils";
type AwaitProps<T> = {
	state: AsyncState<T>;
	Loading?: React.ReactNode;
	Error?: React.ReactNode;
	children: (data: T) => React.ReactNode;
};

export function Await<T>({
	state: { data, error, loading },
	Loading = null,
	Error = null,
	children,
}: AwaitProps<T>) {
	if (loading) {
		return Loading;
	}
	if (data === null) {
		log.error(String(error));
		return Error;
	}
	return children(data);
}
