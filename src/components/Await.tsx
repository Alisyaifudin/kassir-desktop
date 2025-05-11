import { AsyncState } from "../hooks/useAsync";
import { log, Result } from "../lib/utils";
import { TextError } from "./TextError";
type AwaitDangerousProps<T> = {
	state: AsyncState<T>;
	Loading?: React.ReactNode;
	Error?: React.ReactNode;
	children: (data: T) => React.ReactNode;
};

export function AwaitDangerous<T>({
	state: { data, error, loading },
	Loading = null,
	Error = null,
	children,
}: AwaitDangerousProps<T>) {
	if (loading) {
		return Loading;
	}
	if (data === null) {
		if (typeof error === "string") {
			log.error(error);
		} else if (typeof error === "object") {
			log.error(JSON.stringify(error));
		} else {
			log.error("Something went wrong + " + String(error));
		}
		return Error;
	}
	return <>{children(data)}</>;
}

type AwaitProps<E, T> = {
	state: AsyncState<Result<E, T>>;
	Loading?: React.ReactNode;
	Error?: (error: E) => React.ReactNode;
	children: (data: T) => React.ReactNode;
};

export function Await<E, T>({
	state: { data: awaited, error, loading },
	Loading = null,
	Error = () => null,
	children,
}: AwaitProps<E, T>) {
	if (loading) {
		return Loading;
	}
	if (awaited === null) {
		if (typeof error === "string") {
			log.error(error);
		} else if (typeof error === "object") {
			log.error(JSON.stringify(error));
		} else {
			log.error("Something went wrong + " + String(error));
		}
		return <TextError>Something went wrong</TextError>;
	}
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
	return <>{children(data!)}</>;
}
