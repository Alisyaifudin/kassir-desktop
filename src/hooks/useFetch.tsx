import { useCallback, useEffect, useState } from "react";
import { Result } from "~/lib/utils";
// Discriminated union for result
export type AsyncState<E, T> =
	| { settled: false; loading: true; data: null } // mount
	| { settled: true; loading: false; data: Result<E, T> } // success
	| { settled: true; loading: true; data: Result<E, T> }; // retry

export function useFetch<E, T>(func: () => Promise<Result<E, T>>): [AsyncState<E, T>, () => void] {
	const [state, setState] = useState<AsyncState<E, T>>({
		loading: true,
		data: null,
		settled: false,
	});
	const [updated, setUpdated] = useState(0);
	const retry = useCallback(() => {
		setUpdated((p) => (p > 100 ? 0 : p + 1));
	}, []);

	useEffect(() => {
		setState((p) => ({ ...p, loading: true }));
		let cancelled = false;
		const fetchData = async () => {
			const data = await func();
			if (!cancelled) {
				setState({ loading: false, data, settled: true });
			}
		};
		fetchData();
		return () => {
			cancelled = true;
		};
	}, [func, updated]);
	return [state, retry] as const;
}
