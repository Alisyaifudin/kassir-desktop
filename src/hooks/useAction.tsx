import { useState } from "react";

export type AsyncState<E> =
	| { loading: true; error: null }
	| { loading: false; error: E }
	| { loading: false; error: null };

export function useAction<E, T>(
	error: E,
	promise: () => Promise<T>,
): {
	action: () => Promise<T>;
	setError: (e: E | null) => void;
} & AsyncState<E>;
export function useAction<E, T, TVars>(
	error: E,
	promise: (vars: TVars) => Promise<T>,
): {
	action: (vars: TVars) => Promise<T>;
	setError: (e: E | null) => void;
} & AsyncState<E>;
export function useAction<E, T, TVars>(
	error: E,
	promise: ((vars: TVars) => Promise<T>) | (() => Promise<T>),
): {
	action: TVars extends undefined
		? () => Promise<T>
		: (vars: TVars) => Promise<T>;
	setError: (e: E | null) => void;
} & AsyncState<E> {
	const [state, setState] = useState<AsyncState<E>>({
		loading: false,
		error,
	});
	const setError = (e: E | null) => {
		if (e === null) {
			setState({ loading: false, error: null });
		} else {
			setState({ loading: false, error: e });
		}
	};
	const action = async (vars?: TVars) => {
		setState({ loading: true, error: null });
		const res =
			vars !== undefined
				? await (promise as (vars: TVars) => Promise<T>)(vars)
				: await (promise as () => Promise<T>)();
		setState({ loading: false, error: null });
		return res;
	};

	return { action, setError, ...state } as any; // Type assertion needed due to conditional return type
}
