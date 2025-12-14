import { Loader2 } from "lucide-react";

export function Loading() {
	return (
		<div className="flex items-center justify-center flex-1 w-full h-full">
			<Loader2 className="animate-spin icon" />
		</div>
	);
}
export function LoadingBig() {
	return (
		<main className="h-screen w-screen flex items-center justify-center">
			<Loader2 className="animate-spin" size={100} />
		</main>
	);
}
