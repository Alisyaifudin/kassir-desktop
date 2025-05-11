import { useEffect, useState } from "react";
import { emitter } from "~/lib/event-emitter";
// Discriminated union for result
export type AsyncState<T> =
	| { loading: true; data: null; error: null }
	| { loading: false; data: null; error: unknown }
	| { loading: false; data: T; error: null };

export function useAsync<T>(promise: () => Promise<T>, keys?: string[]): AsyncState<T> {
	const [state, setState] = useState<AsyncState<T>>({
		loading: true,
		data: null,
		error: null,
	});

	useEffect(() => {
		const fetchData = () => {
			setState({ loading: true, data: null, error: null });
			promise()
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
		};
		// Initial fetch
		fetchData();
		// If keys are provided, set up event listeners
		if (keys && keys.length > 0) {
			const listeners = keys.map((key) => {
				const listener = () => fetchData();
				emitter.on(key, listener);
				return { key, listener };
			});
			// Cleanup function to remove listeners
			return () => {
				listeners.forEach(({ key, listener }) => {
					emitter.off(key, listener);
				});
			};
		}
	}, []);
	return state;
}
