import { useEffect, useState } from "react";

// Discriminated union for result
export type AsyncState<T> =
	| { loading: true; data: null; error: null }
	| { loading: false; data: null; error: unknown }
	| { loading: false; data: T; error: null };

export function useAsync<T>(promise: Promise<T>, deps?: React.DependencyList): AsyncState<T> {
	const [state, setState] = useState<AsyncState<T>>({
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
