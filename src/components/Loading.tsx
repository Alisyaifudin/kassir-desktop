import { Loader2 } from "lucide-react";

export function Loading() {
	return (
		<main className="flex items-center justify-center flex-1">
			<Loader2 className="animate-spin" size={35} />
		</main>
	);
}
