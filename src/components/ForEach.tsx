import { Fragment } from "react";

export function ForEach<T>({
	items,
	extractKey,
	children,
}: {
	extractKey?: (item: T, index?: number) => string;
	items: T[];
	children: (item: T, index: number) => React.ReactNode;
}) {
	if (items.length === 0) return null;
	return items.map((item, i) => (
		<Fragment key={extractKey === undefined ? i : extractKey(item, i)}>
			{children(item, i)}
		</Fragment>
	));
}
