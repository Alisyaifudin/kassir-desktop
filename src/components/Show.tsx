export function Show({
	when,
	children,
	fallback,
}: {
	when: boolean;
	children: React.ReactNode;
	fallback?: React.ReactNode;
}) {
	if (!when) {
		return fallback;
	}
	return children;
}