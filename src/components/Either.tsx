export function Either({
	if: i,
	then,
	else: els,
}: {
	if: boolean;
	then: React.ReactNode;
	else: React.ReactNode;
}) {
	if (i) return then;
	else return els;
}
