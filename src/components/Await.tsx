import { FetchState } from "../hooks/useFetch";
type AwaitProps<T> = {
	state: FetchState<T>;
	Loading?: React.ReactNode;
	Error?: React.ReactNode;
	children: (data: T) => React.ReactNode;
};

export function Await<T>({
	state: { data, error, loading },
	Loading = <p>Loading...</p>,
	Error = <p>Error</p>,
	children,
}: AwaitProps<T>) {
	if (loading) {
		return Loading;
	}
	if (data === null) {
		console.error(error);
		return Error;
	}
	return children(data);
}
