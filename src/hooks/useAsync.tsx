type AsyncState<T> = { loading: false; error: unknown; data: T };

export function useAsync<T>(promise: Promise<T>) {}
