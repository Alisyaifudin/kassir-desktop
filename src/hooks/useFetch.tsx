import { useEffect, useState } from "react";

// Discriminated union for result
export type FetchState<T> =
	| { loading: true; data: null; error: null }
	| { loading: false; data: null; error: unknown }
	| { loading: false; data: T; error: null };

export function useFetch<T>(promise: Promise<T>, deps?: React.DependencyList): FetchState<T> {
	const [state, setState] = useState<FetchState<T>>({
		loading: true,
		data: null,
		error: null,
	});

	useEffect(() => {
		promise
			.then((data) => {
				setState({
					loading: false,
					data,
					error: null,
				});
			})
			.catch((error) => {
				setState({
					loading: false,
					data: null,
					error,
				});
			});
	}, deps);

	return state;
}
