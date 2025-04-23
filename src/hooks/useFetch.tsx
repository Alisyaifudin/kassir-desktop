import { useEffect, useState } from "react";

// Discriminated union for result
export type FetchState<T> =
	| { loading: true; data: null; error: null }
	| { loading: false; data: null; error: unknown }
	| { loading: false; data: T; error: null };

export function useFetch<T>(func: () => Promise<T>): FetchState<T> {
	const [state, setState] = useState<FetchState<T>>({
		loading: true,
		data: null,
		error: null,
	});

	useEffect(() => {
		func()
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
	}, []);

	return state;
}
