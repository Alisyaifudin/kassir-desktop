import { Fragment } from "react";

export function ForEach<T>({
	items,
	children,
}: {
	items: T[];
	children: (item: T, index: number) => React.ReactNode;
}) {
	if (items.length === 0) return null;
	return items.map((item, i) => <Fragment key={i}>{children(item, i)}</Fragment>);
}
